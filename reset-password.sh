#!/bin/bash
echo "Initiating ProxyPanel Password Reset..."
docker exec -it proxypanel node reset-password.js
