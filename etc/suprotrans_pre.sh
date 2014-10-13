{
for f in *$1
do case $f in
"*"*) # no DATAEXT files, list DATAEXT PREEXT prefixed, if any
	for f in *$1$2
		do  case $f in
		"*"*) exit 1;;
		*) echo "mv $f ${f%$2}";;
		esac
	done
	exit;;
*)  case "$f" in
	zog*.GLOB)
		if [ '.GLOB' = "$1" ]
		then mv "$f" "$f$2" && echo "mv $f$2 $f"
		# make flag be visible for GLOB from OBJ
		else mv "$f" "$f$2" && echo "mv $f$2 zog.GLOB" 
		fi;;
	*)  mv "$f" "$f$2"
		echo "mv $f$2 $f";;
	esac;;
esac
done 
}>norm.lftp

