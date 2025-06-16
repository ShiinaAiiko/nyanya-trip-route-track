#! /bin/bash
name="nyanya-trip-route-track-rnapp"
port=23202
version="v1.0.44"
sakiuiVersion="v1.0.10"
branch="main"
# configFilePath="config.dev.json"
configFilePath="config.pro.json"
registryUrl="https://registry.npmmirror.com/"
DIR=$(cd $(dirname $0) && pwd)
allowMethods=("install copyU debug clear build")

setVersion() {
  echo "-> $version"
  sed -i "s/\"version\":.*$/\"version\":\"${version:1}\",/" ./config.dev.json
}

build() {
  echo "-> 正在启动「${name}」构建服务"
  cd ./android
  ./gradlew assembleRelease
  cd ..

  install
}

install() {
  adb install ./android/app/build/outputs/apk/release/app-release.apk
}

clear() {
  cd ./android
  rm -rf ./app/build
  rm -rf ./app/.cxx
  ./gradlew clean
  cd ..
}

copyU() {
  cp "/mnt/code-workspace/Workspace/Development/@Aiiko/ShiinaAiikoDevWorkspace/@OpenSourceProject/nyanya/nyanya-trip-route-track/rnApp/android/app/build/outputs/apk/release/app-release.apk" \
    "/media/shiina_aiiko/SHIINAAIIKO/"
}

main() {
  if echo "${allowMethods[@]}" | grep -wq "$1"; then
    "$1"
  else
    echo "Invalid command: $1"
  fi
}

main "$1"
