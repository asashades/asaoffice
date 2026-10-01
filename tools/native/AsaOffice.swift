// Asa Office as a real Mac app: a native window around the office page (WKWebView), with its own Dock icon and menus.
// Built by `npm run app` (tools/install-app.mjs, needs the Xcode Command Line Tools: `xcode-select --install`).
//   - On launch it runs `node tools/app.mjs open` (with ASAOFFICE_NO_BROWSER=1) to start the office if needed and print
//     its URL (it holds the secret token), then loads it in the window.
//   - Closing the window keeps the office running; click the Dock icon to bring the window back. Quit (⌘Q) stops the
//     office this app started, like the Chrome-window version does.
// The paths of node and tools/app.mjs come from the app's Info.plist (AsaNodePath, AsaAppScript).
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var loading = false

    let nodePath = (Bundle.main.object(forInfoDictionaryKey: "AsaNodePath") as? String) ?? "/usr/local/bin/node"
    let appScript = (Bundle.main.object(forInfoDictionaryKey: "AsaAppScript") as? String) ?? ""
    let background = NSColor(calibratedRed: 0.08, green: 0.06, blue: 0.10, alpha: 1)

    // MARK: Launch

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = [] // the office's chimes and sounds
        config.preferences.setValue(true, forKey: "developerExtrasEnabled") // right-click → Inspect Element
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.setValue(false, forKey: "drawsBackground")

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Asa Office"
        window.backgroundColor = background
        window.isReleasedWhenClosed = false
        window.contentView = webView
        window.setFrameAutosaveName("AsaOfficeMain")
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        loadOffice()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            window.makeKeyAndOrderFront(nil)
            loadOffice() // also brings the office back if it stopped
        }
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        _ = runNode(["stop"])
    }

    // MARK: The office

    /// Runs `node tools/app.mjs <args>`; returns the exit status and what it printed.
    func runNode(_ args: [String], environment: [String: String] = [:]) -> (Int32, String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = [appScript] + args
        var env = ProcessInfo.processInfo.environment
        for (key, value) in environment { env[key] = value }
        process.environment = env
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        do { try process.run() } catch { return (127, "\(error.localizedDescription)") }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        return (process.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    }

    func loadOffice() {
        if loading { return }
        loading = true
        showMessage("Membuka kantor…")
        DispatchQueue.global().async {
            let (status, output) = self.runNode(["open"], environment: ["ASAOFFICE_NO_BROWSER": "1"])
            let text = output.trimmingCharacters(in: .whitespacesAndNewlines)
            let url = text.split(separator: "\n").map(String.init).last(where: { $0.hasPrefix("http://127.0.0.1") })
            DispatchQueue.main.async {
                self.loading = false
                if status == 0, let url = url, let target = URL(string: url) {
                    self.webView.load(URLRequest(url: target))
                } else {
                    self.showMessage("Kantor tidak bisa dibuka.\n\n\(text.isEmpty ? "Tidak ada keterangan." : text)\n\nLihat ~/Library/Logs/asaoffice/office.log", isError: true)
                }
            }
        }
    }

    func showMessage(_ text: String, isError: Bool = false) {
        let escaped = text.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: "\n", with: "<br>")
        let color = isError ? "#f2a08c" : "#f4e6c4"
        let html = "<body style=\"margin:0;background:#140f1a;color:\(color);font:16px -apple-system,sans-serif;display:grid;place-items:center;height:100vh;text-align:center;padding:24px;box-sizing:border-box\"><div>\(escaped)</div></body>"
        webView.loadHTMLString(html, baseURL: nil)
    }

    @objc func reload() {
        if webView.url != nil && webView.url?.scheme == "http" { webView.reload() } else { loadOffice() }
    }

    // MARK: Menus

    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        main.addItem(appItem)
        let appMenu = NSMenu()
        appItem.submenu = appMenu
        appMenu.addItem(withTitle: "Tentang Asa Office", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Sembunyikan Asa Office", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthers = appMenu.addItem(withTitle: "Sembunyikan yang Lain", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Tampilkan Semua", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Keluar dari Asa Office", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        let editItem = NSMenuItem()
        main.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        editItem.submenu = editMenu
        editMenu.addItem(withTitle: "Urungkan", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = editMenu.addItem(withTitle: "Ulangi", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Potong", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Salin", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Tempel", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Pilih Semua", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        let viewItem = NSMenuItem()
        main.addItem(viewItem)
        let viewMenu = NSMenu(title: "Tampilan")
        viewItem.submenu = viewMenu
        let reloadItem = viewMenu.addItem(withTitle: "Muat Ulang Kantor", action: #selector(AppDelegate.reload), keyEquivalent: "r")
        reloadItem.target = self
        let fullScreen = viewMenu.addItem(withTitle: "Layar Penuh", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]

        let windowItem = NSMenuItem()
        main.addItem(windowItem)
        let windowMenu = NSMenu(title: "Jendela")
        windowItem.submenu = windowMenu
        windowMenu.addItem(withTitle: "Kecilkan", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Tutup Jendela", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")

        NSApp.mainMenu = main
        NSApp.windowsMenu = windowMenu
    }

    // MARK: Navigation: the office stays in the window, everything else opens where it belongs

    func isOffice(_ url: URL) -> Bool {
        let scheme = url.scheme ?? ""
        let host = url.host ?? ""
        return (scheme == "http" && (host == "127.0.0.1" || host == "localhost")) || ["about", "blob", "data"].contains(scheme)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.allow) }
        if isOffice(url) { return decisionHandler(.allow) }
        NSWorkspace.shared.open(url) // obsidian://, https links, mailto: …
        decisionHandler(.cancel)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    // MARK: Page dialogs and the file picker (the 📎 button in the mailbox)

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.beginSheetModal(for: window) { response in
            completionHandler(response == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Batal")
        alert.beginSheetModal(for: window) { response in completionHandler(response == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Batal")
        alert.beginSheetModal(for: window) { response in
            completionHandler(response == .alertFirstButtonReturn ? field.stringValue : nil)
        }
    }
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()
