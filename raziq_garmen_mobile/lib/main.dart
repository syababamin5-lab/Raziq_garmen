import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Mengatur status bar transparan dan ikon gelap/terang agar terlihat modern
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ansa ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F172A)), // Slate modern theme
        useMaterial3: true,
      ),
      home: const WebPageContainer(),
    );
  }
}

class WebPageContainer extends StatefulWidget {
  const WebPageContainer({super.key});

  @override
  State<WebPageContainer> createState() => _WebPageContainerState();
}

class _WebPageContainerState extends State<WebPageContainer> {
  InAppWebViewController? _webViewController;
  double _progress = 0;
  bool _isLoading = true;
  bool _canPop = false;

  final String _targetUrl = "https://ansa.up.railway.app/";

  // Opsi WebView untuk performa dan fungsionalitas maksimal
  final InAppWebViewSettings _settings = InAppWebViewSettings(
    useShouldOverrideUrlLoading: false,
    mediaPlaybackRequiresUserGesture: false,
    javaScriptEnabled: true,
    domStorageEnabled: true, // Crucial agar localStorage login web tetap tersimpan
    databaseEnabled: true,
    useWideViewPort: true,
    loadWithOverviewMode: true,
    supportZoom: false, // Menghindari zoom tidak sengaja agar terasa native
    allowFileAccessFromFileURLs: true,
    allowUniversalAccessFromFileURLs: true,
  );

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _canPop,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        
        if (_webViewController != null) {
          bool canGoBack = await _webViewController!.canGoBack();
          if (canGoBack) {
            // Jika webview bisa kembali, lakukan navigasi mundur di web
            await _webViewController!.goBack();
            return;
          }
        }
        
        // Jika tidak bisa mundur lagi, keluar dari aplikasi
        if (context.mounted) {
          setState(() {
            _canPop = true;
          });
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              // WebView Utama
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(_targetUrl)),
                initialSettings: _settings,
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                },
                onLoadStart: (controller, url) {
                  setState(() {
                    _isLoading = true;
                    _canPop = false; // Reset pop state saat navigasi halaman baru
                  });
                  // Unregister service worker lama untuk mengatasi blank screen akibat cache loop
                  controller.evaluateJavascript(source: """
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        if (registrations.length > 0) {
                          for(let registration of registrations) {
                            registration.unregister();
                          }
                          caches.keys().then(function(names) {
                            for (let name of names) {
                              caches.delete(name);
                            }
                          });
                          window.location.reload();
                        }
                      });
                    }
                  """);
                },
                onLoadStop: (controller, url) async {
                  setState(() {
                    _isLoading = false;
                  });
                  
                  // Update status apakah aplikasi bisa ditutup atau tidak berdasarkan history web
                  bool canGoBack = await controller.canGoBack();
                  setState(() {
                    _canPop = !canGoBack;
                  });
                },
                onProgressChanged: (controller, progress) {
                  setState(() {
                    _progress = progress / 100;
                    if (progress == 100) {
                      _isLoading = false;
                    }
                  });
                },
              ),
              
              // Garis Progress Loading Premium di bagian atas
              if (_isLoading && _progress < 1.0)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SizedBox(
                    height: 3,
                    child: LinearProgressIndicator(
                      value: _progress,
                      backgroundColor: Colors.transparent,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFF3B82F6), // Blue-500 modern
                      ),
                    ),
                  ),
                ),
                
              // Splash Screen Loading Awal
              if (_isLoading && _progress < 0.15)
                Container(
                  color: const Color(0xFF0F172A), // Slate-900 premium background
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Lingkaran loading bergaya minimalis
                        const SizedBox(
                          width: 48,
                          height: 48,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          "Memuat Ansa ERP...",
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
