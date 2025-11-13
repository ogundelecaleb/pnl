import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";

// import * as MediaLibrary from "expo-media-library";
import NetInfo from "@react-native-community/netinfo";
import { Animated, Easing } from "react-native";

const { width, height } = Dimensions.get("window");

const App = () => {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      if (state.isConnected && loadError) {
        // Auto-retry when connection is restored
        handleRetry();
      }
    });

    return () => unsubscribe();
  }, [loadError]);

  // Request permissions for Android
  // const requestPermissions = async () => {
  //   if (Platform.OS === "android") {
  //     const { status } = await MediaLibrary.requestPermissionsAsync();
  //     return status === "granted";
  //   }
  //   return true;
  // };

  // Handle retry
  const handleRetry = () => {
    setLoadError(false);
    // setIsLoading(true);
    setRetryAttempts((prev) => prev + 1);
    webViewRef.current?.reload();
  };

  // Handle external links (WhatsApp, Telegram, etc.)
  const handleExternalLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot Open Link",
          "This link requires an app that isn't installed on your device."
        );
      }
    } catch (error) {
      console.error("Error opening external link:", error);
      Alert.alert("Error", "Failed to open the link");
    }
  };

  // Check if URL should be handled externally
  const shouldHandleExternally = (url) => {
    const externalSchemes = [
      "whatsapp://",
      "https://wa.me/",
      "https://api.whatsapp.com/",
      "tel:",
      "mailto:",
      "sms:",
      "tg://", // Telegram
      "fb://", // Facebook
      "twitter://",
      "instagram://",
      "youtube://",
      "maps://",
      "comgooglemaps://", // Google Maps
    ];

    return externalSchemes.some((scheme) => url.startsWith(scheme));
  };

  // Handle file download
  // const handleDownload = async (url) => {
  //   try {
  //     // const hasPermission = await requestPermissions();
  //     // if (!hasPermission) {
  //     //   Alert.alert(
  //     //     "Permission required",
  //     //     "Please allow storage access to download files"
  //     //   );
  //     //   return;
  //     // }

  //     // Alert.alert("Download started", "Your file is being downloaded", [
  //     //   { text: "OK", onPress: () => {} },
  //     // ]);

  //     // const filename = url.split("/").pop() || `download_${Date.now()}`;
  //     // const downloadPath = `${FileSystem.documentDirectory}${filename}`;

  //     // const downloadResumable = FileSystem.createDownloadResumable(
  //     //   url,
  //     //   downloadPath,
  //     //   {},
  //     //   (downloadProgress) => {
  //     //     const progress =
  //     //       downloadProgress.totalBytesWritten /
  //     //       downloadProgress.totalBytesExpectedToWrite;
  //     //     console.log(`Download progress: ${Math.round(progress * 100)}%`);
  //     //   }
  //     // );

  //     // const { uri } = await downloadResumable.downloadAsync();
  //     // console.log("Finished downloading to", uri);

  //     // if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
  //     //   await MediaLibrary.saveToLibraryAsync(uri);
  //     //   Alert.alert("Success", "Image saved to your gallery");
  //     // } else {
  //     //   if (await Sharing.isAvailableAsync()) {
  //     //     await Sharing.shareAsync(uri);
  //     //   } else {
  //     //     Alert.alert("Success", `File downloaded to: ${uri}`);
  //     //   }
  //     // }
  //   } catch (error) {
  //     console.error("Download failed:", error);
  //     Alert.alert("Error", "Failed to download file");
  //   }
  // };

  const INJECTED_JAVASCRIPT = `(function() {
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

  // const onNavigationStateChange = (navState) => {
  //   // Handle external links first
  //   if (shouldHandleExternally(navState.url)) {
  //     handleExternalLink(navState.url);
  //     return false; // Prevent WebView from navigating
  //   }

  //   if (navState.url.startsWith("blob:")) {
  //     handleBlobUrl(navState.url);
  //     webViewRef.current.stopLoading();
  //     return false;
  //   }

  //   if (
  //     navState.url.match(
  //       /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|mp3|mp4|zip|rar)$/i
  //     )
  //   ) {
  //     handleDownload(navState.url);
  //     webViewRef.current.stopLoading();
  //     return false;
  //   }
  //   return true;
  // };

  // Custom Loading Component
  const LoadingComponent = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, [scaleAnim]);

    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          {/* <ActivityIndicator size="large" color="#007AFF" /> */}
          <Animated.Image
            source={require("./assets/playstore.png")}
            style={{
              width: 80,
              height: 80,
              marginTop: 20,
              transform: [{ scale: scaleAnim }],
            }}
          />
          {/* <Text style={styles.loadingText}>Loading...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we load your content</Text> */}
        </View>
      </View>
    );
  };

  // Network Error Fallback Component
  const NetworkErrorComponent = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        {/* You can replace this with a custom image */}
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>📡</Text>
        </View>

        <Text style={styles.errorTitle}>No Internet Connection</Text>
        <Text style={styles.errorMessage}>
          Please check your internet connection and try again.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>

        <Text style={styles.retryCount}>
          {retryAttempts > 0 && `Retry attempts: ${retryAttempts}`}
        </Text>
      </View>
    </View>
  );

  // Load Error Fallback Component
  const LoadErrorComponent = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>⚠️</Text>
        </View>

        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorMessage}>
          Something went wrong while loading the page.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Show network error when offline */}
      {!isConnected ? (
        <NetworkErrorComponent />
      ) : loadError ? (
        <LoadErrorComponent />
      ) : (
        <>
          <WebView
            ref={webViewRef}
            source={{ uri: "https://app.pnlhub.org/" }}
            style={styles.webview}
            javaScriptEnabled={true}
            incognito={true}
            // injectedJavaScript={`
            //   // Remove capture attribute and modify file inputs to only show file picker
            //   function modifyFileInputs() {
            //     const inputs = document.querySelectorAll('input[type="file"]');
            //     inputs.forEach(input => {
            //       input.removeAttribute('capture');
            //       input.setAttribute('accept', 'image/*');
            //     });
            //   }
              
            //   // Run immediately and on DOM changes
            //   modifyFileInputs();
              
            //   // Observer for dynamically added inputs
            //   const observer = new MutationObserver(() => {
            //     modifyFileInputs();
            //   });
            //   observer.observe(document.body, { childList: true, subtree: true });
              
            //   true;
            // `}
            renderLoading={() => <LoadingComponent />}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setLoadError(true);
              setIsLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView HTTP error: ", nativeEvent);
              setLoadError(true);
              setIsLoading(false);
            }}
            onMessage={(event) => {
              // Handle messages from WebView if needed
            }}
            // injectedJavaScriptBeforeContentLoaded={ }
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsBackForwardNavigationGestures={true}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
            onShouldStartLoadWithRequest={(request) => {
              // Handle external links before they load
              if (shouldHandleExternally(request.url)) {
                handleExternalLink(request.url);
                return false; // Prevent WebView from loading
              }
              return true; // Allow WebView to load
            }}
            // onNavigationStateChange={onNavigationStateChange}
            allowFileAccess={true}
            // allowUniversalAccessFromFileURLs={true}
            // allowFileAccessFromFileURLs={true}
            originWhitelist={["https://*", "http://*"]}
            mixedContentMode="always"
          />

          {/* Custom Loading Overlay */}
          {/* {isLoading && <LoadingComponent />} */}
        </>
      )}
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
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  errorIconText: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: "#26ae5f",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
  },
});

export default App;
