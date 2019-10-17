#!/bin/bash
# My first script

cd dgraph
dgraph zero & dgraph alpha --lru_mb 2048 --zero localhost:5080 && fg