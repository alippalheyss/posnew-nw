# Graph Report - sleepymeerkatglow-main  (2026-11-15)

## Corpus Check
- 181 files · ~486,208 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1135 nodes · 4688 edges · 75 communities (49 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a1ea187`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- ProductDialog.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- Shop.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- Product
- react
- POS.tsx
- Admin.tsx
- compilerOptions
- pagination.tsx
- components.json
- manifest.json
- drawer.tsx
- compilerOptions
- build
- compilerOptions
- carousel.tsx
- vite.config.ts
- build-vercel.mjs
- index.ts
- form.tsx
- scripts
- chart.tsx
- sheet.tsx
- AuthContext.tsx
- breadcrumb.tsx
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- printHelper.ts
- imageUtils.ts
- navigation-menu.tsx
- sendTelegramMessage
- App.tsx
- class-variance-authority
- OnlineOrdersDialog.tsx
- clsx
- llamaService.ts
- vercel.json
- html5-qrcode
- formatters.ts
- input-otp.tsx
- Button
- @radix-ui/react-dropdown-menu
- electron
- auth.ts
- slider.tsx
- @hookform/resolvers@^3.9.0
- @radix-ui/react-progress
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-checkbox
- embla-carousel-react
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @types/jsbarcode@^3.11.4
- @radix-ui/react-popover
- @radix-ui/react-tabs
- @radix-ui/react-toast
- react-resizable-panels
- vaul
- CustomerDisplayOffer
- tailwind-merge
- @tanstack/react-query
- jspdf-autotable.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 297 edges
2. `Button` - 112 edges
3. `react` - 111 edges
4. `DialogContent` - 97 edges
5. `DialogTitle` - 94 edges
6. `DialogHeader()` - 92 edges
7. `Input` - 91 edges
8. `DialogDescription` - 88 edges
9. `showError()` - 79 edges
10. `showSuccess()` - 78 edges

## Surprising Connections (you probably didn't know these)
- `CommandShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts
- `PaginationEllipsis()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (75 total, 26 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.15
Nodes (15): lucide-react, react-router-dom, AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps (+7 more)

### Community 1 - "ProductDialog.tsx"
Cohesion: 0.09
Nodes (27): AddCreditSaleDialog(), AddCreditSaleDialogProps, GoogleIcon(), OnlineImageSearchDialogProps, Command, CommandDialog(), CommandDialogProps, CommandEmpty (+19 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.08
Nodes (30): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, AccountingSettings, AppContext, AppContextProvider(), AppContextType, AppSettings, Cart (+22 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (47): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, ContextMenuCheckboxItem (+39 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, axios@^1.13.2, cmdk@^1.0.0, date-fns@^3.6.0, framer-motion@^13.4.4, html2pdf.js@^0.14.0, jsbarcode@^3.12.3, jspdf@^4.0.0 (+36 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+25 more)

### Community 6 - "Shop.tsx"
Cohesion: 0.20
Nodes (23): Shop(), STATUS_BADGE_MAP, checkRegistrationStatus(), codesMatch(), completeShopPasswordSetup(), fetchCustomerOrders(), fetchPublicShopData(), formatTime12h() (+15 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.08
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (31): author, i18next@^25.7.4, input-otp@^1.2.4, @radix-ui/react-hover-card@^1.1.1, @radix-ui/react-menubar@^1.1.1, @radix-ui/react-navigation-menu@^1.2.0, @radix-ui/react-radio-group@^1.2.0, @radix-ui/react-separator@^1.1.0 (+23 more)

### Community 10 - "Product"
Cohesion: 0.10
Nodes (21): NewCreditSale, CustomerAddDialogProps, ExcelImportDialogProps, ParsedProduct, SelectedItem, FlavourSelectionDialogProps, NearExpiryBroadcastDialogProps, PendingRegistrationsDialogProps (+13 more)

### Community 11 - "react"
Cohesion: 0.10
Nodes (46): jspdf, jspdf-autotable, react, react-day-picker, xlsx, ExcelImportDialog(), DraftPurchaseItem, isProductZeroTax() (+38 more)

### Community 12 - "POS.tsx"
Cohesion: 0.14
Nodes (13): CartQtyStepper(), ActiveAuditSession, AuditEntry, mergeAuditSessions(), mergeProductItems(), playBeep(), ProductAuditState, fetchAllOnlineOrders() (+5 more)

### Community 13 - "Admin.tsx"
Cohesion: 0.16
Nodes (21): PWAInstallButton(), UserDialogProps, User, Admin(), answerCallbackQuery(), BOT_COMMANDS, checkAndLinkCustomerLive(), DEFAULT_TELEGRAM_BOT_TOKEN (+13 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "pagination.tsx"
Cohesion: 0.11
Nodes (20): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+12 more)

### Community 16 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 17 - "manifest.json"
Cohesion: 0.12
Nodes (15): background_color, categories, description, display, display_override, icons, id, name (+7 more)

### Community 18 - "drawer.tsx"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 19 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 20 - "build"
Cohesion: 0.13
Nodes (15): build, appId, directories, files, nsis, productName, win, output (+7 more)

### Community 21 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, allowJs, baseUrl, forceConsistentCasingInFileNames, noImplicitAny, noUnusedLocals, noUnusedParameters, paths (+6 more)

### Community 22 - "carousel.tsx"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 23 - "vite.config.ts"
Cohesion: 0.22
Nodes (8): @dyad-sh/react-vite-component-tagger@^0.8.0, vite@^6.3.4, vite-plugin-pwa@^1.3.0, @vitejs/plugin-react-swc@^3.9.0, @dyad-sh/react-vite-component-tagger, vite, vite-plugin-pwa, @vitejs/plugin-react-swc

### Community 24 - "build-vercel.mjs"
Cohesion: 0.05
Nodes (30): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { privateKey, publicKey }, adminPath, files, fs (+22 more)

### Community 25 - "index.ts"
Cohesion: 0.18
Nodes (4): corsHeaders, getGroupOrOwnerChatId(), getTelegramGroupConfig(), supabase

### Community 26 - "form.tsx"
Cohesion: 0.14
Nodes (16): @radix-ui/react-label@^2.1.0, @radix-ui/react-slot@^1.1.0, react-hook-form@^7.53.0, @radix-ui/react-label, @radix-ui/react-slot, react-hook-form, FormControl, FormDescription (+8 more)

### Community 27 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, build:dev, build:vercel, dev, electron:build, electron:build:arm64, electron:build:portable:x64 (+4 more)

### Community 28 - "chart.tsx"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 29 - "sheet.tsx"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 30 - "AuthContext.tsx"
Cohesion: 0.17
Nodes (11): adminPermissions, AuthContext, AuthContextType, AuthProvider(), cashierPermissions, pendingUserRequests, Database, DEFAULT_SETTINGS_USER_ID (+3 more)

### Community 31 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 32 - "generate-pwa-icons.mjs"
Cohesion: 0.28
Nodes (4): crc32(), createPNG(), makeChunk(), publicDir

### Community 33 - "indexedDb.ts"
Cohesion: 0.36
Nodes (8): clearStore(), deleteStoreItem(), getStoreAll(), openDatabase(), putStoreBatch(), putStoreItem(), StoreName, STORES

### Community 34 - "telegram-webhook.ts"
Cohesion: 0.43
Nodes (7): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase

### Community 35 - "printHelper.ts"
Cohesion: 0.43
Nodes (5): findPrinters(), getQz(), initQz(), printViaIframe(), printViaQz()

### Community 36 - "imageUtils.ts"
Cohesion: 0.31
Nodes (9): supabaseUrl, DARK_COLORS, generatePlaceholderImage(), getAdaptedImageUrl(), hashCode(), LIGHT_COLORS, getStorageCdnUrl(), ImageUploadResult (+1 more)

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "sendTelegramMessage"
Cohesion: 0.29
Nodes (15): calculateExecutiveBriefingData(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup(), handleTelegramBotCommand(), sendGroupSlipSettledNotification(), sendNearExpiryClearanceBroadcast(), sendTelegramMessage() (+7 more)

### Community 39 - "App.tsx"
Cohesion: 0.05
Nodes (44): queryClient, ErrorBoundary, Props, State, PriceFixDialogProps, initialState, Theme, ThemeProvider() (+36 more)

### Community 40 - "class-variance-authority"
Cohesion: 0.20
Nodes (11): class-variance-authority@^0.7.1, class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, ToggleGroup, ToggleGroupContext (+3 more)

### Community 41 - "OnlineOrdersDialog.tsx"
Cohesion: 0.28
Nodes (8): OnlineOrdersDialogProps, STATUS_STYLE, ShopSettings, OnlineOrder, OnlineOrderStatus, PublicShopData, updateOnlineOrderStatus(), sendTelegramOnlineOrderStatusToCustomer()

### Community 43 - "llamaService.ts"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 46 - "formatters.ts"
Cohesion: 0.53
Nodes (5): extractDateOnly(), formatCurrency(), getMaldivesParts(), parseMaldivesDate(), toISODatetime()

### Community 47 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 48 - "Button"
Cohesion: 0.14
Nodes (96): date-fns, react-i18next, App(), AppCloseConfirmDialog(), BankNotificationsDialog(), CustomerAddDialog(), CustomerDisplayOfferDialog(), ExpiryUpdateDialog() (+88 more)

### Community 50 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

### Community 52 - "slider.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, Slider

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `lucide-react`, `ProductDialog.tsx`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `react`, `POS.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `App.tsx`, `class-variance-authority`, `OnlineOrdersDialog.tsx`, `input-otp.tsx`, `Button`, `slider.tsx`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.1455026455026455 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `lucide-react`, `ProductDialog.tsx`, `AppContext.tsx`, `cn`, `dependencies`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `POS.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AuthContext.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `App.tsx`, `class-variance-authority`, `OnlineOrdersDialog.tsx`, `input-otp.tsx`, `Button`, `slider.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Should `ProductDialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09358974358974359 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `dependencies` to `build-vercel.mjs`, `package.json`, `telegram-webhook.ts`, `AuthContext.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08143939393939394 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06363636363636363 - nodes in this community are weakly interconnected._