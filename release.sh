#! /bin/bash
name="nyanya-trip-route-track"
runName="$name-run"
port=23203
branch="main"
# configFilePath="config.dev.json"
configFilePath="config.pro.json"
DIR=$(cd $(dirname $0) && pwd)
allowMethods=("unzip backup runexec run stop gitpull protos dockerremove start logs")

start() {
	echo "-> 开始部署"

	protos

	cd $DIR/web
	./release.sh start

	cd $DIR/server
	./release.sh start
}

protos() {
	echo "-> 准备编译Protobuf"

	cd $DIR/trip-route-track-web
	./release.sh protos

	cd $DIR/trip-route-track-server
	./release.sh protos
}

main() {
	if echo "${allowMethods[@]}" | grep -wq "$1"; then
		"$1"
	else
		echo "Invalid command: $1"
	fi
}

main "$1"
