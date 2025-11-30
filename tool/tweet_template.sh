#!/bin/bash

version=$1
repo_url=$2
name="xj-formatter"
ext="#java #formatter #vscodeextension"
LF=$'\\n'
text="${name}@v${version} was published.${LF}${repo_url}"
[ -n "$ext" ] && text=${text}${LF}${ext} || :
echo -n "{\"text\":\"${text}\"}"
