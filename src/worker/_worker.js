"use strict";
import { render } from "./render";
import template from "./template.html";
import manifest from "./ssr-manifest.json";
const handler = {
  async fetch(request) {
    const html = await render(request.url, template, manifest);
    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8"
      }
    });
  }
};
export default handler;