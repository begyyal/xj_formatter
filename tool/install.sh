#!/bin/bash

version=$(./tool/shjp ./package.json -t version)
code --install-extension xj-formatter-${version}.vsix --force