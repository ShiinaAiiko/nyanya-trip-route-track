import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Button,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import {WebView} from 'react-native-webview';

export default function EnhancedWebViewChecker({
  minVersion = 70,
  onPass,
  onFail,
  children,
}: {
  minVersion?: number; // 最低要求的 Chrome 内核版本，默认70
  onPass?: () => void;
  onFail?: (error: any) => void;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [errorText, setErrorText] = useState<string>('');

  const handleOpenWebViewUpdate = () => {
    let url;
    if (Platform.OS === 'android') {
      // 优先跳转系统 WebView，失败则跳转 Chrome
      url = 'market://details?id=com.google.android.webview';
    } else {
      // iOS 无法单独更新 WebView
      Alert.alert('提示', 'iOS 的 WebView 随系统更新，请升级到最新 iOS 版本');
      return;
    }

    Linking.openURL(url).catch(err => {
      // 降级到网页版商店链接
      const fallbackUrl =
        Platform.select({
          android:
            // 'https://www.apkmirror.com/apk/google-inc/android-system-webview/',
            'https://play.google.com/store/apps/details?id=com.google.android.webview',
          ios: 'https://apps.apple.com/app/id535886823',
        }) || '';
      Linking.openURL(fallbackUrl).catch(console.warn);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'checking') {
        setStatus('fail');
        setErrorText('检测超时');
        onFail?.('Timeout');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'ok') {
    return <View style={{flex: 1}}>{children}</View>;
  }

  if (status === 'fail') {
    const APK_URL =
      'https://www.apkmirror.com/apk/google-inc/android-system-webview/';
    const handleDownload = async () => {
      try {
        // 检查 URL 是否可用
        const supported = await Linking.canOpenURL(APK_URL);

        if (supported) {
          // 跳转到浏览器下载
          await Linking.openURL(APK_URL);
        } else {
          Alert.alert('错误', '无法打开下载链接');
        }
      } catch (error: any) {
        Alert.alert('错误', '下载失败: ' + error?.message);
      }
    };
    return (
      <View style={styles.container}>
        <Text style={styles.title}>设备 WebView 兼容性检测失败</Text>
        <Text style={styles.tip}>
          {errorText || '请检查WebView或Chrome版本'}
        </Text>
        <Button title="前往更新 WebView" onPress={handleOpenWebViewUpdate} />
        <View style={{height: 12}} />
        <Button title="直接下载 Webview APK" onPress={handleDownload} />
        <View style={{height: 12}} />
        <Button title="重试检测" onPress={() => setStatus('checking')} />
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <WebView
        source={{
          html: `
          <html><body>
          <script>
            (function() {
              try {
                var ua = navigator.userAgent || '';
                var versionMatch = ua.match(/Chrome\\/([0-9]+)/);
                if (versionMatch && versionMatch[1]) {
                  document.title = 'WEBVIEW_OK_' + versionMatch[1];
                } else {
                  document.title = 'WEBVIEW_UNKNOWN';
                }
              } catch(e) {
                document.title = 'WEBVIEW_FAIL';
              }
            })();
          </script>
          </body></html>
        `,
        }}
        onLoadEnd={syntheticEvent => {
          const {nativeEvent} = syntheticEvent;
          const title = nativeEvent.title || '';

          if (title.startsWith('WEBVIEW_OK_')) {
            const ver = parseInt(title.replace('WEBVIEW_OK_', ''), 10);
            if (ver >= minVersion) {
              setStatus('ok');
              onPass?.();
            } else {
              setStatus('fail');
              setErrorText(
                `当前WebView内核版本过低 (Chrome ${ver})，需要 >= ${minVersion}`,
              );
              onFail?.(`Chrome ${ver}`);
            }
          } else if (title === 'WEBVIEW_UNKNOWN') {
            setStatus('fail');
            setErrorText('无法识别 WebView 版本');
            onFail?.('Unknown WebView');
          } else {
            setStatus('fail');
            setErrorText('WebView加载异常');
            onFail?.('WebView Load Fail');
          }
        }}
        onError={e => {
          console.warn('WebView error', e.nativeEvent);
          setStatus('fail');
          setErrorText('WebView加载错误');
          onFail?.(e.nativeEvent);
        }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={{flex: 1, opacity: 0}}
      />
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={styles.tip}>正在检测设备 WebView 兼容性...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loading: {
    position: 'absolute',
    top: '40%',
    width: '100%',
    alignItems: 'center',
  },
});
