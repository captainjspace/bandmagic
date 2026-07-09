#!/usr/bin/env node

import { parse } from "node-html-parser";;
import * as fs from "node:fs";



const file = () => {
  let data="",err=[];
  const fn=process.argv[2];
  console.log(typeof fn, process.argv.length)
  if (!fs.isFile(fn)) {
    try { data = fs.readFileSync(fn).toString(); }
    catch (e) { err.push(e) }
    } else { err.push('filename?') }
  err=(err.isEmpty())?undefined:err;
  return { data,err } 
}
debugger;
const html=file.toString();

// 1. Parse the HTML string into a DOM root
const root = parse(html);

// 2. Function to recursively convert nodes into a dictionary
const records=[]
function insertRecord(tagName, text) {
  records.push({ tag: tagName, text: text })
}

const tagStack=[];
function nodeToDictionary(node) {
  if (node.nodeType === 3) { // Text node
    const text = node.text.trim();
    return text;
  }

  const result = {};
  // Capture tag name
  result.tagName = node.tagName ? node.tagName.toLowerCase() : 'root';
   
  tagStack.push(result.tagName);

  // Capture attributes as a key-value dictionary
  if (node.attributes && Object.keys(node.attributes).length > 0) {
    result.attributes = { ...node.attributes };

  }

  // Capture child nodes recursively
  if (node.childNodes && node.childNodes.length > 0) {
    result.children = node.childNodes
      .map(child => nodeToDictionary(child))
      .filter(child => typeof child === 'object' || child !== ''); // Filter empty text
  }
  const p=tagStack.pop();
  const classes=Object.entries(result.children).filter( ([k,v]) => k==="className")
  if (classes.length >0) insertRecord(p, classes);
  console.log(tagStack);
  return result;
}

// 3. Generate the dictionary
const htmlDict = nodeToDictionary(root);
const JSONDict = JSON.stringify(htmlDict, null, 2);
//console.log(JSONDict);
console.table(tagStack);


