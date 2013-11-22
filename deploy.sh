#!/bin/sh
## to make all affected files group writable on git pull,
## so that group members can update repository
## without affecting write access for other group members

mask=`umask`
umask 0003
git pull
umask $mask
