---
title: "돈 · 투자"
layout: archive
permalink: /categories/money/
author_profile: true
---

미국주식(장기), 국내주식(스윙), 코인(장기). 종목 추천이 아니라, 내가 어떻게 판단했는지를 남긴 기록입니다.
{: .notice}

{% assign posts = site.categories.money %}
{% for post in posts %}
  {% include archive-single.html type=page.entries_layout %}
{% endfor %}
