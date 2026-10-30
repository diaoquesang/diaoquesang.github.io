---
permalink: /
title: ""
layout: default
redirect_from:
  - /about/
  - /about.html
---

{% assign base = page.base %}

<h1 class="section-title" id="about-me">😉 About Me</h1>

{% for p in site.data.about.paragraphs %}
<div class="md-block">{{ p | markdownify }}</div>
{% endfor %}

<div class="badge-row">
  {% for b in site.data.about.badges %}
    <a href="{{ b.link }}" target="_blank" rel="noopener"><img src="{{ b.src }}" alt="{{ b.alt }}" loading="lazy"></a>
  {% endfor %}
</div>

<h1 class="section-title" id="education">📖 Education</h1>

{% for item in site.data.education %}
  {% include entry-card.html item=item %}
  {% comment %}old banner row, replaced by entry-card 2026-10-30:
  {% include timeline-row.html item=item %}
  {% endcomment %}
{% endfor %}

<h1 class="section-title" id="experience">💻 Experience</h1>

{% for item in site.data.experience %}
  {% include entry-card.html item=item %}
{% endfor %}

<h1 class="section-title" id="news">🔥 News</h1>

{% include date-list.html items=site.data.news %}

<h1 class="section-title" id="honors">🏅 Honors</h1>

<h2 class="sub-title">Distinctions</h2>

{% include date-list.html items=site.data.honors.distinctions %}

<h2 class="sub-title">Scholarships</h2>

{% include date-list.html items=site.data.honors.scholarships %}

<h1 class="section-title" id="funding">💰 Funding</h1>

{% include date-list.html items=site.data.funding %}

<h1 class="section-title" id="publications">💡 Publications</h1>

<p class="pub-note">{{ site.data.publications.note_html }}</p>

<h2 class="sub-title">Conference Papers</h2>

{% for item in site.data.publications.conferences.featured %}
  {% include work-card.html item=item %}
{% endfor %}

{% include paper-list.html items=site.data.publications.conferences.list %}

<h2 class="sub-title">Journal Papers</h2>

{% for item in site.data.publications.journals.featured %}
  {% include work-card.html item=item %}
{% endfor %}

{% include paper-list.html items=site.data.publications.journals.list %}

<h2 class="sub-title">Preprint Papers</h2>

{% for item in site.data.publications.preprints.featured %}
  {% include work-card.html item=item %}
{% endfor %}

<h1 class="section-title" id="patents">🔬 Patents</h1>

<h2 class="sub-title">CN Invention Patents</h2>

{% include date-list.html items=site.data.patents.invention %}

<h2 class="sub-title">CN Design Patents</h2>

{% include date-list.html items=site.data.patents.design %}

<h1 class="section-title" id="software">📱 Software</h1>

{% for item in site.data.software.featured %}
  {% include work-card.html item=item %}
{% endfor %}

{% include date-list.html items=site.data.software.list %}

<h1 class="section-title" id="competitions">🏇🏻 Competitions</h1>

<h2 class="sub-title">International &amp; National Prizes</h2>

{% include date-list.html items=site.data.competitions.national %}

<h2 class="sub-title">Regional &amp; Provincial Prizes</h2>

{% include date-list.html items=site.data.competitions.regional %}

<h1 class="section-title" id="services">🔖 Services</h1>

{% include service-list.html items=site.data.service.conferences journals=site.data.service.journals %}

<h1 class="section-title" id="communities">🧑‍🤝‍🧑 Communities</h1>

{% include community-cards.html items=site.data.communities.links %}

<h1 class="section-title" id="my-favorite-music">🎼 My Favorite Music</h1>

<div class="music-quote">
  <h3>{{ site.data.music.quote_html }}</h3>
  <p class="quote-by">{{ site.data.music.quote_by }}</p>
</div>

<div class="music-grid">
  {% for t in site.data.music.tracks %}
    <div class="music-card">
      <div class="work-media">
        <span class="badge">{{ t.badge }}</span>
        <img src="{{ base }}{{ t.cover }}" alt="{{ t.title }}" loading="lazy">
        <button class="queue-track play-fab" data-index="{{ forloop.index0 }}" aria-label="Play {{ t.title }}" title="Play"><i class="fa-solid fa-play"></i></button>
      </div>
      <div class="work-body">
        <h3 class="work-title">
          <a href="{{ t.url }}" target="_blank" rel="noopener">{{ t.title }}</a>
        </h3>
        <p class="work-authors">{{ t.artists }}</p>
        {% comment %} album duplicates the cover badge — hidden on request:
        <p class="work-venue"><i>{{ t.album }}</i></p>
        {% endcomment %}
      </div>
    </div>
  {% endfor %}
</div>
