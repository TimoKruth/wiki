const PROVIDERS = [
  {
    key: 'youtube',
    title: 'YouTube video',
    match (url) {
      const host = normalizeHost(url.hostname)
      if (host === 'youtu.be') {
        return validMediaId(firstPathSegment(url))
      }
      if (!['youtube.com', 'm.youtube.com'].includes(host)) {
        return null
      }
      if (url.pathname === '/watch') {
        return validMediaId(url.searchParams.get('v'))
      }
      const match = url.pathname.match(/^\/(?:embed|v)\/([\w-]+)/)
      return match ? match[1] : null
    },
    buildSrc: id => `https://www.youtube.com/embed/${id}`,
    allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share'
  },
  {
    key: 'vimeo',
    title: 'Vimeo video',
    match (url) {
      const host = normalizeHost(url.hostname)
      if (host === 'player.vimeo.com') {
        const match = url.pathname.match(/^\/video\/(\d+)/)
        return match ? match[1] : null
      }
      if (host !== 'vimeo.com') {
        return null
      }
      const segments = url.pathname.split('/').filter(Boolean)
      return [...segments].reverse().find(segment => /^\d+$/.test(segment)) || null
    },
    buildSrc: id => `https://player.vimeo.com/video/${id}`,
    allow: 'autoplay; fullscreen; picture-in-picture'
  },
  {
    key: 'dailymotion',
    title: 'Dailymotion video',
    match (url) {
      const host = normalizeHost(url.hostname)
      if (host === 'dai.ly') {
        return validMediaId(firstPathSegment(url))
      }
      if (host !== 'dailymotion.com') {
        return null
      }
      const match = url.pathname.match(/^\/video\/([\w-]+)/)
      return match ? match[1] : null
    },
    buildSrc: id => `https://www.dailymotion.com/embed/video/${id}`,
    allow: 'autoplay; fullscreen; picture-in-picture'
  },
  {
    key: 'spotify',
    title: 'Spotify media',
    match (url) {
      if (normalizeHost(url.hostname) !== 'open.spotify.com') {
        return null
      }
      const match = url.pathname.match(/^\/(artist|album|track)\/([\w-]+)/)
      return match ? `${match[1]}/${match[2]}` : null
    },
    buildSrc: id => `https://open.spotify.com/embed/${id}`,
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
  }
]

module.exports = {
  resolveEmbed (rawUrl) {
    const url = parseHttpUrl(rawUrl)
    if (!url) {
      return null
    }
    for (const provider of PROVIDERS) {
      const id = provider.match(url)
      if (id) {
        return {
          provider: provider.key,
          title: provider.title,
          src: provider.buildSrc(id),
          allow: provider.allow
        }
      }
    }
    return null
  },

  renderEmbeds ($) {
    $('oembed').each((idx, elm) => {
      const rawUrl = $(elm).attr('url')
      const embed = this.resolveEmbed(rawUrl)
      if (embed) {
        const wrapper = $('<div>')
          .addClass(`media-embed is-${embed.provider}`)
        const iframe = $('<iframe>')
          .attr('src', embed.src)
          .attr('title', embed.title)
          .attr('loading', 'lazy')
          .attr('allow', embed.allow)
          .attr('allowfullscreen', '')
          .attr('referrerpolicy', 'strict-origin-when-cross-origin')
        wrapper.append(iframe)
        $(elm).replaceWith(wrapper)
      } else {
        const url = parseHttpUrl(rawUrl)
        if (url) {
          const link = $('<a>')
            .attr('href', url.toString())
            .attr('target', '_blank')
            .attr('rel', 'noopener noreferrer')
            .text(rawUrl)
          $(elm).replaceWith(link)
        } else {
          $(elm).replaceWith($('<span>').text('Unsupported media'))
        }
      }
    })
  }
}

function parseHttpUrl (rawUrl) {
  if (!rawUrl) {
    return null
  }
  try {
    const url = new URL(rawUrl)
    return ['http:', 'https:'].includes(url.protocol) ? url : null
  } catch (err) {
    return null
  }
}

function normalizeHost (host) {
  return host.toLowerCase().replace(/^www\./, '')
}

function firstPathSegment (url) {
  return url.pathname.split('/').filter(Boolean)[0] || null
}

function validMediaId (id) {
  return id && /^[\w-]+$/.test(id) ? id : null
}
