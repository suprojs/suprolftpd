#!/bin/sh
#unzip && rm _data/exchange/remote/13d5b3485e5_0.json.bz2.S1.GLOB >
#`->_data/exchange/local/income/13d5b3485e5_0.json
#debug: 
set -x ; exec >>logunzip 2>&1
for f in *$ZEXT*$DATAEXT
do s=$f
$UNZIP "$s" | dd 'status=noxfer' of="$LIDIR/${f%$ZEXT*}" && rm "$s"
done
