/**
 * Gallery-only audio fixtures. TEST_TONE is a 0.3s 440Hz WAV generated
 * for the gallery, inlined so the gallery needs no file on R2 / MinIO.
 * BROKEN_AUDIO points at a file that doesn't exist, to show the
 * "audio unavailable" state.
 */
export const TEST_TONE =
  'data:audio/wav;base64,' +
  'UklGRoQJAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWAJAACAjZmip6eimo6Bc2deWVhcZHB9i5egpqejm5CD' +
  'dmlgWlhbY257iJWfpaeknZKGeGxhW1hbYWx4hpKdpKalnpSIe25jXFlaYGp2g5Cbo6aln5aKfXBlXVlaX2h0gY6ZoaWloZiM' +
  'f3NnX1paXmZxfouXoKWloZqPgnVpYFtaXWVvfImVnqSlopuRhHdrYlxaXWNteoeTnKOlo5yTh3ptY11aXGJsd4SQm6Klo56U' +
  'iXxwZV5bXGFqdYKOmaCko5+Wi35yZ19bW2Boc4CMl5+jpKCYjYF0aWFcW19ncX2KlZ6jpKCZj4N2a2JdW15lb3uHk5yio6Ga' +
  'kYV5bWReXF5kbXmFkZqho6Gck4d7b2ZfXF1jbHeDj5mgo6KdlIl9cWdgXV1ianWBjJeeoqKelouAdGlhXV1haHN+ipWdoaKe' +
  'l42CdmtjXl1gZ3F8iJOboaKfmY+EeG1kX11gZm96hpGaoKKgmpGGem9mYF5fZW14hI+Yn6Ggm5OIfHFoYV5fZGx2go2XnaGg' +
  'nJSKfnNpYl5fY2p0gIuVnKCgnZWMgXVrZF9fYmlyfYmTm5+gnZeOg3dtZWBfYWhxe4eRmZ+gnpiPhXlvZmFfYWZveYWPmJ6g' +
  'npmRh3txaGJfYWVteIONlp2fn5qSiH1zamNgYGVsdoCLlZufn5uUin91a2RgYGRrdH+Jk5qen5uVjIF3bWZhYGNpcn2HkZmd' +
  'n5yWjoN5b2diYWNocXuFj5ednpyXj4V7cWhjYWJnb3mDjZacnp2YkYd9c2pkYWJmbneBjJSanZ2Zkol/dGxlYmJmbHV/ipOZ' +
  'nZ2ak4qAdm1mYmJla3R+iJGYnJ2alIyCeG9oY2JkanJ8ho+Xm52blY6EenFpZGJkaXF6hI6Vmp2blo+GfHJqZWNkaG94goyU' +
  'mZybl5CHfnRsZmNkZ253gIqSmJybmJKJf3ZtZ2RkZ211f4iRl5ubmZOLgXhvaGRkZmx0fYaPlpqbmZSMg3lxamVkZmtye4WO' +
  'lZmbmZWNhXtya2ZkZmpxeoOMk5ibmpWPhn10bGdlZWlweIGKkpeampaQiH92bmhlZWludoCJkJaampeRiYB3b2lmZWhtdX6H' +
  'j5WZmpeSi4J5cWpmZWhsdHyFjZSYmZiTjIR7cmxnZmdscnuEjJOXmZiUjYV8dG1oZmdrcXmCipGWmZiUjod+dW5pZmdqcHiA' +
  'iZCVmJiVj4h/d3BqZ2dqb3Z/h4+UmJiWkImBeXFraGdpbnV9ho2Tl5iWkYuDenJsaGdpbXR8hIySlpiWkoyEfHRtaWdpbXN6' +
  'goqRlZeWk42FfXVvamhpbHJ5gYmQlZeWk46Hf3dwa2hpa3F4gIeOlJaWlI+IgHhxbGlpa3B2foaNk5aWlJCJgnpzbWppa291' +
  'fYSMkZWWlZCKg3t0bmppam50e4OKkJSWlZGLhH11b2tpam5zeoKJj5OVlZKMhn53cGxqam1yeYCIjpOVlZKNh394cm1qam1x' +
  'eH+GjZKUlZOOiIF6c25ramxwdn6Fi5GUlZOPiYJ7dG9sa2xwdXyDipCTlJOQioN8dnBsa2xvdHuCiY6SlJOQi4V+d3Fta2xv' +
  'dHqBiI2SlJORjIZ/eHJubGxuc3l/hoyRk5ORjYeAeXNvbGxucnh+hYuQk5ORjYiBe3VwbWxucXd9hIqPkpORjomDfHZxbWxt' +
  'cXZ8gomOkZOSjoqEfXdybm1tcHV7gYeNkJKSj4qFfnhzb21tcHR6gIaMkJKSj4uGgHl0cG5tcHN5f4WLj5GRkIyHgXp1cW5u' +
  'b3N4foSKjpGRkIyIgnx2cm9ub3J3fYOIjZCRkI2Ig313cm9ub3J2fIKHjI+RkI2JhH54c3Bvb3F2e4GGi4+QkI6KhX95dHFv' +
  'b3F1eoCFio6QkI6KhoB6dXJvb3F0eX6EiY2PkI6LhoF7dnJwb3F0eH2DiIyPj46Lh4J9d3NxcHFzd32Ch4uOj46MiIN+eHRx' +
  'cHFzd3yBhoqNj46MiYR/eXVycHFzdnuAhYmNjo6MiYV/enZzcXFydnp/hImMjo6NioWAe3dzcXFydXl+g4iLjY6NioaBfHh0' +
  'cnFydXl9goeKjY6NioeCfXl1cnFydHh8gYaKjI2Ni4eDfnp2c3JydHd8gIWJjI2Ni4iEf3t3dHJydHd7gISIi42Ni4iEgHt3' +
  'dHNzdHd6f4OHioyMi4mFgXx4dXNzdHZ6foKGioyMi4mGgX15dnRzdHZ5fYGFiYuMi4mGgn56d3RzdHZ5fIGFiIqLi4mHg397' +
  'd3V0dHV4fICEh4qLi4qHg398eHZ0dHV4e3+Dh4mLi4qHhIB8eXZ1dHV4e36ChomKi4qIhYF9end1dXV3en6ChYiKioqIhYJ+' +
  'end2dXV3en2BhIeJioqIhYJ/e3h2dXV3eX2AhIeJiomIhoN/fHl3dnZ3eXyAg4aIiYmIhoOAfHl3dnZ3eXx/goWHiYmIhoSA' +
  'fXp4dnZ3eXt+goWHiImIhoSBfnt4d3Z3eHt+gYSGiImIh4SBfnt5d3d3eHt9gIOGh4iIh4WCf3x6eHd3eHp9gIOFh4iIh4WC' +
  'f316eHd3eHp8f4KEhoeIh4WDgH17eXh4eHp8f4GEhoeHh4WDgH57eXh4eHp8foGDhYeHh4WDgX58enl4eXp8foCDhYaHhoWE' +
  'gX98enl4eXp7foCChIaGhoWEgn99e3p5eXp7fYCChIWGhoWEgoB9fHp5eXp7fX+Bg4WGhoWEgoB+fHt6eXp7fX+Bg4SFhYWE' +
  'goB+fXt6enp7fX6AgoSFhYWEg4F/fXt6enp7fH6AgoOEhYWEg4F/fXx7enp7fH6AgYOEhYSEg4F/fnx7e3t7fH5/gYKEhISE' +
  'g4GAfn18e3t7fH5/gYKDhISEg4KAf318e3t8fH1/gIKDg4SDg4KAf358fHt8fH1/gIGCg4ODg4KAf359fHx8fH1+gIGCg4OD' +
  'goKBf359fHx8fX1+gIGCgoODgoKBgH9+fXx8fX1+f4CBgoKCgoKBgH9+fX19fX1+f4CBgoKCgoGBgH9+fn19fX5+f4CBgYKC' +
  'goGBgH9+fn19fX5+f4CAgYGCgYGBgH9/fn5+fn5+f4CAgYGBgYGBgIB/fn5+fn5+f3+AgIGBgYGAgIB/f35+fn5/f3+AgICB' +
  'gYGAgIB/f39/f39/f3+AgICAgICAgIB/f39/f39/f3+AgICAgICAgIB/f39/f39/f3+AgICAgICAgIB/f39/f39/f38=';

export const BROKEN_AUDIO = '/garden-gallery-missing-audio.mp3';
