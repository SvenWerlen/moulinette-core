#!/bin/bash
MAJVER=`grep version module.json | awk -F'"' '{ print $4}' | awk -F'.' '{ print $1}'`
MINVER=`grep version module.json | awk -F'"' '{ print $4}' | awk -F'.' '{ print $2}'`
FIXVER=`grep version module.json | awk -F'"' '{ print $4}' | awk -F'.' '{ print $3}'`
#echo "Before: $MAJVER.$MINVER.$FIXVER"
NEWMINVER="$(($MINVER+1))"
sed -i "s/$MAJVER\.$MINVER\.$FIXVER/$MAJVER\.$NEWMINVER\.0/g" module.json
VERSION="v-$MAJVER.$NEWMINVER.0"

git add module.json
echo "git commit -m \"$VERSION\" && git tag \"$VERSION\" && git push && git push --tags"

#cat ../module.template.json | sed "s/VERSION/0.$NEWVER.0/g" > ../module.json
#echo "Version: 0.$NEWVER.0"

