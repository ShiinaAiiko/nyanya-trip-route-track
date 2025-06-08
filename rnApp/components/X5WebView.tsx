import {requireNativeComponent, ViewProps} from 'react-native';

// 定义组件接收的 props 类型
interface X5WebViewProps extends ViewProps {
  url?: string; // 可选的 url 属性
}

// 使用类型化的 requireNativeComponent
const X5WebView = requireNativeComponent<X5WebViewProps>('X5WebView');

export default X5WebView;
