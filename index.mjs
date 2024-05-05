import { customsearch } from '@googleapis/customsearch'

// type is here for when we want to support multiple search engines
// an in any case there will be a factory method outside this module
export default function createEngine(type, { apiKey, cx } = {}) {
  if (type !== 'google') {
    throw new Error('unsupported search engine')
  }

  const { cse } = customsearch({
    version: 'v1',
    auth: apiKey
  })

  return {
    search: async (query, { maxResults = 10 } = {}) => {
      if (maxResults > 100) {
        throw new Error('maxResults cannot exceed 100')
      }

      const results = []
      let startIndex = 0

      while (results.length < maxResults && startIndex < maxResults && startIndex < 100) {
        const { data } = await cse.list({
          q: query,
          start: startIndex,
          cx
        })

        results.push(...data.items)
        if (!data.queries.nextPage) {
          break
        }
        startIndex = data.queries.nextPage[0].startIndex
      }
      
      return results
    },

    toHtml: (results, pageTitle) => {
      const innerResults = results.map(({ displayLink, link, htmlTitle, htmlSnippet }) => `
        <div>
          <h3>${htmlTitle}</h3>
          <p>${htmlSnippet}</p>
          <a href="${link}">${displayLink}</a>
        </div>
      `).join('<hr>\n')

      return `
        <html>
          <head>
            <title>${pageTitle}</title>
            <style>
              body {
                font-family: sans-serif;
              }
            </style>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>${pageTitle}</h1>
            ${innerResults}
          </body>
        </html>
      `
    }
  }
}
