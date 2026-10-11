import type { LegalContent } from './types';

/**
 * Terms of Service and Privacy Policy, en-US (canvas page "Legal", LG1–LG4,
 * 2026-10-09). `[[…]]` marks a fact Dylan still has to fill in; it renders
 * highlighted until replaced. Keep the section ids and order the same in
 * all three languages (legal.test.ts checks).
 */
export const legalEnUs: LegalContent = {
  ui: {
    eyebrow: "Legal",
    onThisPage: "On this page",
    navLabel: "Legal pages",
    homeLabel: "Dygo home page",
    regions: {
      vn: "Vietnam",
      au: "Australia",
      sg: "Singapore"
    },
    termsLabel: "Terms of Service",
    privacyLabel: "Privacy Policy",
    copyright: "© 2026 [[COMPANY LEGAL NAME]]"
  },
  terms: {
    title: "Terms of Service",
    description: "The terms for using Dygo, the English vocabulary app, in Vietnam, Australia and Singapore.",
    updated: "Last updated [[DD Month 2026]] · Applies to dygo website and app",
    shortTitle: "The short version",
    short: [
      "Dygo is free to start. If we ever charge for something, you see the price before you pay.",
      "Under 16? A parent or guardian creates and manages your account.",
      "Your words are yours. You can download or delete them at any time.",
      "Speaking practice: your recording is checked, then deleted.",
      "Be kind in groups, and only add content you have the right to share.",
      "The consumer and privacy laws of your country still protect you."
    ],
    regionQuestion: "Where do you live?",
    regionNote: {
      vn: "You are covered by Vietnam’s Law on Protection of Consumers’ Rights 2023. The Vietnamese version of these terms is the one that counts.",
      au: "You are covered by the Australian Consumer Law. Its guarantees can’t be excluded by these terms.",
      sg: "You are covered by Singapore’s Consumer Protection (Fair Trading) Act 2003."
    },
    seeLocal: "See your local rights",
    sections: [
      {
        id: "t1",
        title: "Who we are",
        blocks: [
          {
            kind: "p",
            text: "Dygo (“Dygo”, “we”, “us”) is run by [[COMPANY LEGAL NAME]], a company registered in Vietnam under enterprise code [[ENTERPRISE CODE]], at [[REGISTERED ADDRESS]]. You can reach us at [[hello@dygo.example]]."
          },
          {
            kind: "p",
            text: "These terms are an agreement between you and us. By creating an account or using Dygo, you accept them. Our Privacy Policy explains how we handle your personal data and is part of these terms."
          }
        ]
      },
      {
        id: "t2",
        title: "Who can use Dygo",
        blocks: [
          {
            kind: "ul",
            items: [
              "You can create your own account if you are 16 or older.",
              "If you are under 16, a parent or legal guardian must create the account, accept these terms for you and manage it from their own account. Children’s gardens are always linked to a parent account.",
              "Schools, tutors and language centres that invite students under 16 must have the consent of each student’s parent or guardian first."
            ]
          }
        ]
      },
      {
        id: "t3",
        title: "Your account",
        blocks: [
          {
            kind: "p",
            text: "Give us accurate details and keep your password private. Your account is for you alone, so please don’t share it. Tell us straight away at [[support@dygo.example]] if you think someone else has used it."
          }
        ]
      },
      {
        id: "t4",
        title: "Free service and paid plans",
        blocks: [
          {
            kind: "p",
            text: "Dygo is free for learners. We may later offer paid plans, for example seat licences for schools and tutors. Before you pay, we will show the price, what it includes, how often you are charged and how to cancel."
          },
          {
            kind: "p",
            text: "Payments are handled by our payment provider, [[Stripe]]. We never see or store your full card number. You can cancel a subscription at any time, and it stops at the end of the period you have paid for. Refunds follow the law of your country (see “Your local rights”)."
          }
        ]
      },
      {
        id: "t5",
        title: "Your words and content",
        blocks: [
          {
            kind: "p",
            text: "Your own words, example sentences, beds and notes stay yours. You give us permission to store, process and display them only so we can run Dygo for you and, if you share them, for your group."
          },
          {
            kind: "p",
            text: "Only add content you have the right to share. Don’t add anything unlawful, hateful, sexual, violent or someone else’s personal information."
          }
        ]
      },
      {
        id: "t6",
        title: "Groups and shared gardens",
        blocks: [
          {
            kind: "p",
            text: "In a group, members can see your display name and the beds you share. Your own progress and scores stay private to you; the group only sees group totals. Admins manage members, editors add beds and words, and viewers water plants. Group admins are responsible for who they invite and for the content they share with the group."
          }
        ]
      },
      {
        id: "t7",
        title: "Speaking practice",
        blocks: [
          {
            kind: "p",
            text: "Dygo uses your microphone only while you tap to record. Your recording is checked against a native speaker’s, then deleted straight away. We don’t keep recordings or use them to train AI. Speaking scores are a learning guide, not an official assessment."
          }
        ]
      },
      {
        id: "t8",
        title: "Meanings made with AI",
        blocks: [
          {
            kind: "p",
            text: "Some meanings, examples and translations are prepared with the help of AI and checked by our own rules. They can still contain mistakes. Please tell us when something looks wrong, and don’t rely on Dygo for exams, legal or medical wording."
          }
        ]
      },
      {
        id: "t9",
        title: "Fair use",
        blocks: [
          {
            kind: "p",
            text: "Please don’t:"
          },
          {
            kind: "ul",
            items: [
              "harass, bully or deceive other people, especially children;",
              "copy Dygo’s content or data in bulk, scrape it or use bots;",
              "reverse engineer, overload or break into Dygo or other accounts;",
              "use Dygo for advertising, spam or any unlawful purpose."
            ]
          }
        ]
      },
      {
        id: "t10",
        title: "Our content and brand",
        blocks: [
          {
            kind: "p",
            text: "The Dygo app, design, word lists, audio, illustrations, the Sprout logo and Dygo the bee belong to us or our licensors. We give you a personal, non-transferable licence to use them while you use Dygo, for your own learning."
          }
        ]
      },
      {
        id: "t11",
        title: "Changes to Dygo and to these terms",
        blocks: [
          {
            kind: "p",
            text: "We keep improving Dygo, so features may change. If we make an important change to these terms, we will tell you in the app or by email at least 30 days before it applies. If you don’t agree, you can delete your account before then."
          }
        ]
      },
      {
        id: "t12",
        title: "Ending your account",
        blocks: [
          {
            kind: "p",
            text: "You can delete your account at any time in Profile › Account › Delete account. We delete your personal data within [[30]] days, except what the law requires us to keep, such as payment records."
          },
          {
            kind: "p",
            text: "We may suspend or close an account that seriously or repeatedly breaks these terms or puts other users, especially children, at risk. Where we can, we will tell you why and give you a chance to respond."
          }
        ]
      },
      {
        id: "t13",
        title: "Our responsibility to you",
        blocks: [
          {
            kind: "p",
            text: "We work hard to keep Dygo running and accurate, but we can’t promise it will always be available or error-free. As far as the law allows, we are not responsible for indirect losses, and our total liability is limited to the amount you paid us in the 12 months before the claim, or [[USD 50]] if you paid nothing."
          },
          {
            kind: "p",
            text: "Nothing in these terms limits a right you have under consumer law that cannot legally be limited, or our responsibility for death or personal injury caused by our negligence, or for fraud."
          }
        ]
      },
      {
        id: "t14",
        title: "Law and disputes",
        blocks: [
          {
            kind: "p",
            text: "These terms are governed by the laws of Vietnam. If you live in Australia or Singapore, you also keep the protection of the mandatory laws where you live, and you can bring a claim in your local courts or tribunals."
          },
          {
            kind: "p",
            text: "If something goes wrong, please contact us first at [[support@dygo.example]]. We aim to reply within 7 days and to sort it out within 30."
          }
        ]
      }
    ],
    local: {
      id: "t15",
      title: "Your local rights",
      blocks: {
        vn: [
          {
            kind: "p",
            text: "<b>Vietnam.</b> As a consumer, you have rights under the Law on Protection of Consumers’ Rights 2023, including clear information before you pay and fair contract terms. Any term in conflict with that law does not apply to you."
          },
          {
            kind: "p",
            text: "These terms are available in Vietnamese and English. If the two differ, the Vietnamese version applies to users in Vietnam."
          },
          {
            kind: "p",
            text: "If we can’t resolve a complaint, you can contact the consumer protection authority under the Ministry of Industry and Trade, or a consumer protection organisation, or take it to a Vietnamese court."
          }
        ],
        au: [
          {
            kind: "p",
            text: "<b>Australia.</b> Our services come with guarantees that cannot be excluded under the Australian Consumer Law. For a major failure with a paid service, you are entitled to cancel and get a refund for the unused portion, or to compensation for its reduced value. You are also entitled to compensation for any other reasonably foreseeable loss or damage."
          },
          {
            kind: "p",
            text: "The limits in “Our responsibility to you” apply only as far as the Australian Consumer Law allows. If we can’t resolve a complaint, you can contact your state or territory fair trading office or the ACCC."
          }
        ],
        sg: [
          {
            kind: "p",
            text: "<b>Singapore.</b> You are protected by the Consumer Protection (Fair Trading) Act 2003 against unfair practices. If we can’t resolve a complaint, you can contact the Consumers Association of Singapore (CASE) or file a claim with the Small Claims Tribunals."
          },
          {
            kind: "p",
            text: "Your personal data is handled in line with the Personal Data Protection Act 2012 (PDPA). See our Privacy Policy for details."
          }
        ]
      }
    },
    contact: {
      id: "t16",
      title: "Contact us",
      blocks: [
        {
          kind: "p",
          text: "[[COMPANY LEGAL NAME]] · [[REGISTERED ADDRESS]]"
        },
        {
          kind: "p",
          text: "Support: [[support@dygo.example]] · Personal data: [[dpo@dygo.example]]"
        }
      ]
    }
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Dygo collects, uses and protects your personal data under Vietnam’s PDPL, Australia’s Privacy Act and Singapore’s PDPA.",
    updated: "Last updated [[DD Month 2026]] · Covers Vietnam’s PDPL, Australia’s Privacy Act and Singapore’s PDPA",
    shortTitle: "The short version",
    short: [
      "We collect only what Dygo needs to teach you words: your account, your words and your progress.",
      "We never sell your data and we never show ads.",
      "Your voice is checked, then deleted. We don’t keep recordings.",
      "Children under 16 join through a parent, and their profiles are never public.",
      "You can see, fix, download or delete your data at any time.",
      "Questions? Write to our data protection officer at [[dpo@dygo.example]]."
    ],
    regionQuestion: "Where do you live?",
    regionNote: {
      vn: "Vietnam’s Law on Personal Data Protection (No. 91/2025/QH15) and Decree 356/2025/ND-CP apply to you.",
      au: "The Privacy Act 1988 and the Australian Privacy Principles apply to you.",
      sg: "The Personal Data Protection Act 2012 (PDPA) applies to you."
    },
    seeLocal: "See your local rights",
    sections: [
      {
        id: "p1",
        title: "Who is responsible for your data",
        blocks: [
          {
            kind: "p",
            text: "[[COMPANY LEGAL NAME]] ([[ENTERPRISE CODE]], [[REGISTERED ADDRESS]]) decides how and why your personal data is processed. Under each country’s law we are the data controller (Vietnam), the APP entity (Australia) and the organisation (Singapore)."
          },
          {
            kind: "p",
            text: "Our data protection officer is [[DPO NAME]], reachable at [[dpo@dygo.example]]."
          }
        ]
      },
      {
        id: "p2",
        title: "What we collect and why",
        blocks: [
          {
            kind: "table",
            head: [
              "What",
              "Why we need it",
              "Legal basis",
              "How long we keep it"
            ],
            rows: [
              [
                "Account: email, display name, password (stored scrambled), app and translation language",
                "To create your account, sign you in and show Dygo in your language",
                "Contract; consent",
                "Until you delete your account"
              ],
              [
                "Learning data: your words, beds, reviews, quiz and speaking scores",
                "To grow your garden and bring words back before you forget them",
                "Contract",
                "Until you delete them or your account"
              ],
              [
                "Group data: groups you join, your role, shared beds",
                "To run shared gardens",
                "Contract",
                "While you are a member"
              ],
              [
                "Voice recording",
                "To compare your voice with a native speaker’s",
                "Consent (you tap the mic)",
                "Deleted right after the check"
              ],
              [
                "Child profile: nickname, age range",
                "So a parent can run a child’s garden",
                "Parent’s consent",
                "Until the parent deletes it"
              ],
              [
                "Device data: notification token, browser, crash reports",
                "To send reminders you turn on and to fix bugs",
                "Consent; legitimate purpose",
                "[[12 months]]"
              ],
              [
                "Payment records (paid plans only)",
                "To bill you and meet tax law",
                "Contract; legal obligation",
                "As long as tax law requires"
              ]
            ]
          },
          {
            kind: "p",
            text: "We don’t collect precise location, contacts, photos or biometric data, and we don’t use your data for advertising."
          }
        ]
      },
      {
        id: "p3",
        title: "Children",
        blocks: [
          {
            kind: "ul",
            items: [
              "A child under 16 can only use Dygo through a parent or guardian, who gives consent for them.",
              "In Vietnam, for children aged 7 and over we also ask the child, in simple words, before processing that needs consent.",
              "We collect only a nickname and an age range for a child, never their email or phone number.",
              "Children’s profiles are never public or searchable, and we never send them marketing."
            ]
          }
        ]
      },
      {
        id: "p4",
        title: "Your voice",
        blocks: [
          {
            kind: "p",
            text: "When you tap the mic, your recording is sent to our own speech checker, compared with a native speaker’s recording and deleted as soon as the result is ready. It is not stored, shared or used to train AI. If you never tap the mic, we never hear you."
          }
        ]
      },
      {
        id: "p5",
        title: "Who we share data with",
        blocks: [
          {
            kind: "ul",
            items: [
              "<b>Hosting and database:</b> [[HOSTING PROVIDER]], in [[REGION]].",
              "<b>Word meanings:</b> Google (Gemini) receives only the word or sentence you look up, never your name or email.",
              "<b>Audio delivery:</b> Cloudflare stores and serves the native-speaker audio.",
              "<b>Email:</b> [[EMAIL PROVIDER]] sends sign-in and reminder emails.",
              "<b>Payments (paid plans only):</b> [[Stripe]].",
              "<b>Your group:</b> members see your display name and shared beds, plus group totals. They never see your own progress or scores.",
              "<b>Authorities:</b> only when the law requires it."
            ]
          },
          {
            kind: "p",
            text: "Each provider can use your data only to help us run Dygo, under a written agreement."
          }
        ]
      },
      {
        id: "p6",
        title: "Sending data to other countries",
        blocks: [
          {
            kind: "p",
            text: "Your data is stored in [[REGION]], and some providers above work from other countries. Before transferring personal data abroad we put a written agreement in place that requires the same level of protection, and we complete the assessments each country’s law requires. See “Your local rights” for details."
          }
        ]
      },
      {
        id: "p7",
        title: "Keeping your data safe",
        blocks: [
          {
            kind: "p",
            text: "We encrypt data in transit, store passwords scrambled, limit staff access to what each person needs and keep access logs. If a data breach is likely to harm you, we will tell you and the regulator within the time your country’s law sets."
          }
        ]
      },
      {
        id: "p8",
        title: "Your rights",
        blocks: [
          {
            kind: "p",
            text: "You can ask to:"
          },
          {
            kind: "ul",
            items: [
              "see the personal data we hold about you and how we use it;",
              "correct it if it is wrong;",
              "get a copy of your words and progress to take elsewhere;",
              "delete your data or your whole account;",
              "withdraw consent, for example turn off reminders or stop speaking practice;",
              "object to or restrict how we use it, and complain to a regulator."
            ]
          },
          {
            kind: "p",
            text: "Most of this is in Profile › Account. For anything else, write to [[dpo@dygo.example]]. We reply within 30 days, or sooner when your country’s law sets a shorter time, and we don’t charge for it."
          }
        ]
      },
      {
        id: "p9",
        title: "Automated decisions",
        blocks: [
          {
            kind: "p",
            text: "Dygo decides automatically when a word comes back for review and how closely your speech matches a native speaker. These decisions only shape your practice. They never have legal effects or affect your access to Dygo."
          }
        ]
      },
      {
        id: "p10",
        title: "Cookies and local storage",
        blocks: [
          {
            kind: "p",
            text: "We use only what Dygo needs to work: a sign-in cookie, your language choice, and audio saved on your device so lessons play offline. We use no advertising or cross-site tracking cookies. [[Confirm: add a line here if you add analytics.]]"
          }
        ]
      }
    ],
    local: {
      id: "p11",
      title: "Your local rights",
      blocks: {
        vn: [
          {
            kind: "p",
            text: "<b>Vietnam: Law on Personal Data Protection No. 91/2025/QH15 and Decree 356/2025/ND-CP.</b> We ask for your consent separately for each purpose, never by default. You have the rights listed above, plus the right to be told before your data is processed and to claim compensation for unlawful processing."
          },
          {
            kind: "p",
            text: "We have prepared a personal data processing impact assessment and a cross-border transfer impact assessment, and we file them with the Department of Cybersecurity and High-tech Crime Prevention (A05), Ministry of Public Security, as the law requires. We notify A05 of qualifying breaches within 72 hours."
          },
          {
            kind: "p",
            text: "You can complain to A05 or take your claim to a Vietnamese court. The Vietnamese version of this policy applies to users in Vietnam."
          }
        ],
        au: [
          {
            kind: "p",
            text: "<b>Australia: Privacy Act 1988 and Australian Privacy Principles.</b> You may use Dygo under a nickname instead of your real name. Before sending data overseas we take reasonable steps so overseas recipients handle it in line with the APPs."
          },
          {
            kind: "p",
            text: "Under the Notifiable Data Breaches scheme, we notify you and the Office of the Australian Information Commissioner (OAIC) as soon as practicable if a breach is likely to cause you serious harm."
          },
          {
            kind: "p",
            text: "If you are not happy with our reply, you can complain to the OAIC at oaic.gov.au."
          }
        ],
        sg: [
          {
            kind: "p",
            text: "<b>Singapore: Personal Data Protection Act 2012 (PDPA).</b> We collect, use and disclose your data only with your consent or as the PDPA allows, and only for the purposes in this policy. For learners under 13 we always get a parent’s or guardian’s consent."
          },
          {
            kind: "p",
            text: "We transfer data outside Singapore only to recipients bound to give it a comparable standard of protection. We notify the Personal Data Protection Commission (PDPC) of notifiable breaches within 3 calendar days of assessing them, and tell you when the law requires."
          },
          {
            kind: "p",
            text: "You can contact our data protection officer at [[dpo@dygo.example]], or complain to the PDPC at pdpc.gov.sg. We don’t send marketing calls or messages to Singapore numbers without your consent."
          }
        ]
      }
    },
    contact: {
      id: "p12",
      title: "Changes and contact",
      blocks: [
        {
          kind: "p",
          text: "If we change this policy in an important way, we will tell you in the app at least 30 days before it applies, and ask for your consent again where the law requires."
        },
        {
          kind: "p",
          text: "Data protection officer: [[DPO NAME]] · [[dpo@dygo.example]] · [[REGISTERED ADDRESS]]"
        }
      ]
    }
  }
};
