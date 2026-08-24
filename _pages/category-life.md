---
title: "삶"
layout: archive
permalink: /categories/life/
author_profile: true
---

돈과 몸을 관통하는 태도, 실패, 선택에 대한 기록.
{: .notice}

{% assign posts = site.categories.life %}
{% for post in posts %}
  {% include archive-single.html type=page.entries_layout %}
{% endfor %}
