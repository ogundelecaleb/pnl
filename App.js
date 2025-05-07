import React, { useRef } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

const App = () => {
  const webViewRef = useRef(null);

  // Request permissions for Android
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === "granted";
    }
    return true; // iOS handles permissions differently
  };

  // Handle file download
  const handleDownload = async (url) => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission required",
          "Please allow storage access to download files"
        );
        return;
      }

      Alert.alert("Download started", "Your file is being downloaded", [
        { text: "OK", onPress: () => {} },
      ]);

      // Extract filename from URL
      const filename = url.split("/").pop() || `download_${Date.now()}`;
      const downloadPath = `${FileSystem.documentDirectory}${filename}`;

      // Start download
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        downloadPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${Math.round(progress * 100)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      console.log("Finished downloading to", uri);

      // Handle different file types
      if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        // Save image to media library
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Success", "Image saved to your gallery");
      } else {
        // Share other file types
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Success", `File downloaded to: ${uri}`);
        }
      }
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Error", "Failed to download file");
    }
  };

  const INJECTED_JAVASCRIPT = `(function() {
    // Prevent blob URL navigation
    document.addEventListener('click', function(e) {
      const anchor = e.target.closest('a[href^="blob:"]');
      if (anchor) {
        e.preventDefault();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BLOB_URL_CLICKED',
          url: anchor.href
        }));
      }
    }, true);
  })();`;
  const handleBlobUrl = async (url) => {
    Alert.alert(
      "Unsupported Content",
      "This content cannot be downloaded directly. Please use the share button on the website if available.",
      [{ text: "OK" }]
    );
  };

  // Updated navigation handler
  const onNavigationStateChange = (navState) => {
    // Check for blob URLs
    if (navState.url.startsWith("blob:")) {
      handleBlobUrl(navState.url);
      webViewRef.current.stopLoading();
      return false;
    }

    // Existing download handling for regular files
    if (
      navState.url.match(
        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|mp3|mp4|zip|rar)$/i
      )
    ) {
      handleDownload(navState.url);
      webViewRef.current.stopLoading();
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: "https://business.vant.ng/" }}
        style={styles.webview}
        javaScriptEnabled={true}
        onMessage={async (event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            
            // Handle Excel exports
            if (message.type === 'EXCEL_EXPORT') {
              const fileUri = `${FileSystem.cacheDirectory}${message.filename}`;
              await FileSystem.writeAsStringAsync(fileUri, message.data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              await Sharing.shareAsync(fileUri, {
                mimeType: message.mimeType || 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: message.dialogTitle || 'Save Document',
              });
            }
            
            // Handle image captures
            else if (message.type === 'IMAGE_CAPTURE') {
              const fileUri = `${FileSystem.cacheDirectory}${message.filename}`;
              await FileSystem.writeAsStringAsync(fileUri, message.data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              await Sharing.shareAsync(fileUri, {
                mimeType: message.mimeType || 'image/png',
                dialogTitle: message.dialogTitle || 'Save Image',
                UTI: 'public.png' // iOS uniform type identifier
              });
            }
            
            // Clean up files after sharing
            setTimeout(async () => {
              try {
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
              } catch (cleanupError) {
                console.log('Cleanup error:', cleanupError);
              }
            }, 30000); // Clean up after 30 seconds
      
          } catch (error) {
            Alert.alert('Error', 'Failed to save file: ' + error.message);
            console.error('File save error:', error);
          }
        }}
        injectedJavaScriptBeforeContentLoaded={`
          // Unified file saver for both Excel and images
          window.webViewFileSaver = {
            saveAs: function(blob, filename, mimeType, dialogTitle) {
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = function() {
                  const base64data = reader.result.split(',')[1];
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: blob.type.includes('image') ? 'IMAGE_CAPTURE' : 'EXCEL_EXPORT',
                    filename: filename,
                    data: base64data,
                    mimeType: blob.type,
                    dialogTitle: dialogTitle
                  }));
                  resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            },
            
            captureElement: async function(element, filename) {
              try {
                if (typeof html2canvas !== 'function') {
                  throw new Error('html2canvas not loaded');
                }
                
                const canvas = await html2canvas(element, {
                  useCORS: true,
                  scale: 2
                });
                
                return new Promise((resolve) => {
                  canvas.toBlob(async (blob) => {
                    await this.saveAs(blob, filename, 'image/png', 'Save Image');
                    resolve();
                  }, 'image/png');
                });
              } catch (error) {
                console.error('Capture error:', error);
                throw error;
              }
            }
          };
          
          // Backward compatibility
          window.saveAs = window.webViewFileSaver.saveAs;
          true;
        `}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        onNavigationStateChange={onNavigationStateChange}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        originWhitelist={["https://*", "http://*"]}
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
});

export default App;
