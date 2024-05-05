#!/usr/bin/env node

import rc from 'rc'
import { Command } from 'commander'
import createEngine from './index.mjs'
import hcat from 'hcat'

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
  .argument('<query>', 'search query')
  .description('search for a query')
  .option('--engine <engine>', 'search engine', 'google')
  .option('--apiKey <apiKey>', 'google custom search engine api key', config.apiKey)
  .option('--cx <cx>', 'custom search engine identifier', config.cx)
  .option('--maxResults <maxResults>', 'max results', 10)
  .option('-o --outputType <outputType>', 'output type: json, table (text), html (text), html-browser (open default browser)', config.outputType)
  .action(async (query, options) => {
    if (options.engine !== 'google') {
      throw new Error('unsupported search engine')
    }

    if (!['json', 'table', 'html', 'html-browser'].includes(options.outputType)) {
      throw new Error('unsupported output type')
    }

    const engine = createEngine(options.engine, { apiKey: options.apiKey, cx: options.cx })

    const results = await engine.search(query, { maxResults: options.maxResults })
    if (options.outputType === 'json') {
      console.log(JSON.stringify(results, null, '\t'))
    } else if (options.outputType === 'table') {
      throw new Error('unimplemented output type')
    } else if (options.outputType.startsWith('html')) {
      const html = engine.toHtml(results, `${options.engine} search: "${query}" ${results.length} results`)
      if (options.outputType === 'html') {
        console.log(html)
      } else {
        hcat(html)
      }
    }
  })

program.parse()
