#!/bin/bash
#run this as root
if [ "$EUID" -ne 0 ]
  then echo "Please run this script with sudo or as root user. E.g: sudo $0"
  exit
fi
nodepath=$(type -p node)
error=0
if [ -z "$nodepath" ];then
  echo -e '\033[0;31mError! node.js is not installed. Please install it prior running application.\033[0m'
  error=1
fi
if [ $error -eq 1 ];then
  exit 1
fi

/sbin/setcap cap_net_raw,cap_net_admin,cap_net_bind_service+eip $nodepath
