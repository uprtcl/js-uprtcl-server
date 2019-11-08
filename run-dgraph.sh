#!/bin/bash
# My first script

cd dgraph
dgraph zero & dgraph alpha --port_offset 2 --lru_mb 2048 --zero localhost:5080 && fg