"""GOPT (Goodness Of Pronunciation feature-based Transformer), inference only.

Architecture and parameter names are those of the official implementation
(Gong et al., ICASSP 2022, https://github.com/YuanGongND/gopt, BSD licence in
data/gopt/LICENSE-GOPT) so the trained state dict loads unchanged. Attention
and MLP blocks follow timm. Weights were trained on speechocean762 with
Dygo's wav2vec2 features (com.dydoacademy.gopt).
"""

from __future__ import annotations

import torch
import torch.nn as nn


class Attention(nn.Module):
    def __init__(self, dim: int, num_heads: int = 8) -> None:
        super().__init__()
        self.num_heads = num_heads
        self.scale = (dim // num_heads) ** -0.5
        self.qkv = nn.Linear(dim, dim * 3, bias=False)
        self.attn_drop = nn.Dropout(0.0)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(0.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, n, c = x.shape
        qkv = self.qkv(x).reshape(b, n, 3, self.num_heads, c // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        attn = ((q @ k.transpose(-2, -1)) * self.scale).softmax(dim=-1)
        return self.proj((attn @ v).transpose(1, 2).reshape(b, n, c))


class Mlp(nn.Module):
    def __init__(self, dim: int, hidden: int) -> None:
        super().__init__()
        self.fc1 = nn.Linear(dim, hidden)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden, dim)
        self.drop = nn.Dropout(0.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc2(self.act(self.fc1(x)))


class Block(nn.Module):
    def __init__(self, dim: int, num_heads: int, mlp_ratio: float = 4.0) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = Attention(dim, num_heads)
        self.drop_path = nn.Identity()
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = Mlp(dim, int(dim * mlp_ratio))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        return x + self.mlp(self.norm2(x))


def _head(dim: int) -> nn.Sequential:
    return nn.Sequential(nn.LayerNorm(dim), nn.Linear(dim, 1))


class GOPT(nn.Module):
    """Input: features [B, T<=50, 84] and canonical phone ids [B, T] (-1 = padding).
    Output (all scores on the speechocean762 0–2 scale): five utterance scores
    (accuracy, completeness, fluency, prosody, total), phone scores [B, T, 1]
    and word accuracy / stress / total at phone level [B, T, 1] each."""

    def __init__(self, embed_dim: int = 24, num_heads: int = 1, depth: int = 3, input_dim: int = 84) -> None:
        super().__init__()
        self.input_dim, self.embed_dim = input_dim, embed_dim
        self.blocks = nn.ModuleList([Block(embed_dim, num_heads) for _ in range(depth)])
        self.pos_embed = nn.Parameter(torch.zeros(1, 55, embed_dim))  # 5 utterance tokens + 50 phones
        self.in_proj = nn.Linear(input_dim, embed_dim)
        self.mlp_head_phn = _head(embed_dim)
        self.mlp_head_word1, self.mlp_head_word2, self.mlp_head_word3 = _head(embed_dim), _head(embed_dim), _head(embed_dim)
        self.phn_proj = nn.Linear(40, embed_dim)
        self.cls_token1 = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.mlp_head_utt1 = _head(embed_dim)
        self.cls_token2 = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.mlp_head_utt2 = _head(embed_dim)
        self.cls_token3 = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.mlp_head_utt3 = _head(embed_dim)
        self.cls_token4 = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.mlp_head_utt4 = _head(embed_dim)
        self.cls_token5 = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.mlp_head_utt5 = _head(embed_dim)

    def forward(self, x: torch.Tensor, phn: torch.Tensor):
        b = x.shape[0]
        phn_embed = self.phn_proj(torch.nn.functional.one_hot(phn.long() + 1, num_classes=40).float())
        if self.embed_dim != self.input_dim:
            x = self.in_proj(x)
        x = x + phn_embed
        cls = [getattr(self, f"cls_token{i}").expand(b, -1, -1) for i in range(1, 6)]
        x = torch.cat((*cls, x), dim=1) + self.pos_embed
        for blk in self.blocks:
            x = blk(x)
        utt = [getattr(self, f"mlp_head_utt{i + 1}")(x[:, i]) for i in range(5)]
        t = x[:, 5:]
        return (*utt, self.mlp_head_phn(t), self.mlp_head_word1(t), self.mlp_head_word2(t), self.mlp_head_word3(t))
