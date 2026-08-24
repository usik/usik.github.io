---
title: "몸 · 운동"
layout: archive
permalink: /categories/body/
author_profile: true
---

운동도 목표도 나이와 몸 상태에 따라 달라진다. 정답이 아니라, 지금 내 몸에서 내가 내린 선택을 남깁니다.
{: .notice}

{% assign posts = site.categories.body %}
{% for post in posts %}
  {% include archive-single.html type=page.entries_layout %}
{% endfor %}
