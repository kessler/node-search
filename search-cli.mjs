#!/usr/bin/env node

import rc from 'rc'
import { Command } from 'commander'
import createEngine from './index.mjs'
import hcat from 'hcat'
import { pipeline } from 'node:stream/promises'

const config = rc('kessler-search', {
  apiKey: undefined,
  cx: undefined,
  outputType: 'json'
})

const program = new Command()

program
  .name('kessler search cli')
  .description('a search cli tool')
  .version('1.0.0')
  .argument('[query]', 'search query')
  .description('search for a query')
  .option('--engine <engine>', 'search engine', 'google')
  .option('--apiKey <apiKey>', 'google custom search engine api key', config.apiKey)
  .option('--cx <cx>', 'custom search engine identifier', config.cx)
  .option('-m, --maxResults <maxResults>', 'max results', 10)
  .option('-o --outputType <outputType>', `output types: 
json, table (text), html (text), 
html-browser (open default browser), 
links (an array of links), links-context, 
links-text, links-text-context`, config.outputType)
  .action(async (query, options) => {
    if (!query) {
      console.error('waiting for input from stdin...')
      query = await bufferStdin()
    }

    if (options.engine !== 'google') {
      throw new Error('unsupported search engine')
    }

    if (!['json', 'table', 'html', 'html-browser', 'links', 'links-context', 'links-text', 'links-text-context'].includes(options.outputType)) {
      throw new Error('unsupported output type')
    }

    const engine = createEngine(options.engine, { apiKey: options.apiKey, cx: options.cx })

    const results = await engine.search(query, { maxResults: options.maxResults })
    if (options.outputType === 'json') {
      console.log(JSON.stringify(results, null, '\t'))
    } else if (options.outputType === 'table') {
      console.table(resultsToTableObject(results))
    } else if (options.outputType === 'links') {
      console.log(JSON.stringify(results.map(result => result.link)))
    } else if (options.outputType === 'links-context') {
      console.log(JSON.stringify(results.map(result => ({ link: result.link, title: result.title, snippet: result.snippet }))))
    } else if (options.outputType === 'links-text') {
      console.log(results.map(result => result.link).join('\n'))
    } else if (options.outputType === 'links-text-context') {
      console.log(
        results.map(result =>
          ([
            `title: ${escapeSeparators(result.title)}`,
            `snippet: ${escapeSeparators(result.snippet)}`,
            `link: ${escapeSeparators(result.link)}`
            ].join(' ||| '))
        ).join('\n')
      )
    } else if (options.outputType.startsWith('html')) {
      const html = engine.toHtml(results, `${options.engine} search: "${query}" ${results.length} results`)
      if (options.outputType === 'html') {
        console.log(html)
      } else {
        hcat(html)
      }
    }
  })

async function bufferStdin() {
  let buffers = []

  await pipeline(process.stdin, async function * (source) {
    for await (const chunk of source) {
      buffers.push(chunk)
    }
  })

  return Buffer.concat(buffers)
}

function escapeSeparators(string) {
  return string.replace(/\n/gm, '\\n').replace(/[\|]{3}/gm, '\\|\\|\\|')
}

function resultsToTableObject(arr) {
  const result = {}
  for (let i = 0; i < arr.length; i++) {
    result[arr[i].link] = {
      title: arr[i].title
    }
  }

  return result
}

program.parse()
