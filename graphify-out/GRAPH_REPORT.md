# Graph Report - sleepymeerkatglow-main  (2026-11-15)

## Corpus Check
- 181 files · ~485,235 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1132 nodes · 4680 edges · 76 communities (48 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e20d24f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- command.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- POS.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- GSTReports.tsx
- StockAudit.tsx
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
- dhivehiTranslator.ts
- breadcrumb.tsx
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- printHelper.ts
- ErrorBoundary.tsx
- navigation-menu.tsx
- sendTelegramMessage
- App.tsx
- class-variance-authority
- toast.tsx
- clsx
- llamaService.ts
- vercel.json
- html5-qrcode
- formatters.ts
- @radix-ui/react-hover-card
- Button
- @radix-ui/react-dropdown-menu
- AppContextProvider
- auth.ts
- ThemeProvider.tsx
- @radix-ui/react-switch
- @radix-ui/react-progress
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- tailwindcss
- embla-carousel-react
- i18next
- next-themes
- @types/jsbarcode@^3.11.4
- qrcode.react
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-toggle-group
- react-dom
- react-hook-form
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

## Communities (76 total, 28 thin omitted)

### Community 0 - "react"
Cohesion: 0.09
Nodes (19): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, react, BankAlertPill(), Layout(), LayoutProps, AccordionContent, AccordionItem (+11 more)

### Community 1 - "command.tsx"
Cohesion: 0.21
Nodes (14): AddCreditSaleDialog(), AddCreditSaleDialogProps, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput (+6 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.08
Nodes (27): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, Props, AccountingSettings, AppContext, AppContextType, AppSettings, Cart (+19 more)

### Community 3 - "cn"
Cohesion: 0.08
Nodes (41): Avatar, AvatarFallback, AvatarImage, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem (+33 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, axios@^1.13.2, date-fns@^3.6.0, framer-motion@^13.4.4, @hookform/resolvers@^3.9.0, html2pdf.js@^0.14.0, input-otp@^1.2.4, jspdf@^4.0.0 (+35 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (34): { contextBridge, ipcRenderer }, devDependencies, autoprefixer@^10.4.20, electron@^45.0.0, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0 (+26 more)

### Community 6 - "POS.tsx"
Cohesion: 0.05
Nodes (69): NewCreditSale, CustomerAddDialogProps, ExcelImportDialogProps, ParsedProduct, SelectedItem, FlavourSelectionDialogProps, NearExpiryBroadcastDialogProps, OnlineOrdersDialogProps (+61 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.09
Nodes (27): SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader (+19 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (31): author, cmdk@^1.0.0, jsbarcode@^3.12.3, @radix-ui/react-accordion@^1.2.0, @radix-ui/react-alert-dialog@^1.1.1, @radix-ui/react-dialog@^1.1.2, @radix-ui/react-scroll-area@^1.1.0, @radix-ui/react-select@^2.1.1 (+23 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.18
Nodes (14): Action, ActionType, _actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+6 more)

### Community 11 - "GSTReports.tsx"
Cohesion: 0.16
Nodes (28): react-router-dom, xlsx, AmbientBackground, ExcelImportDialog(), ProtectedRoute(), ProtectedRouteProps, CardContent, CardDescription (+20 more)

### Community 12 - "StockAudit.tsx"
Cohesion: 0.11
Nodes (22): UserDialogProps, adminPermissions, AuthContext, AuthContextType, AuthProvider(), cashierPermissions, pendingUserRequests, useAuth() (+14 more)

### Community 13 - "Admin.tsx"
Cohesion: 0.17
Nodes (20): PWAInstallButton(), Switch, Admin(), answerCallbackQuery(), BOT_COMMANDS, checkAndLinkCustomerLive(), DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME (+12 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "pagination.tsx"
Cohesion: 0.10
Nodes (22): react-day-picker@^8.10.1, react-day-picker, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+14 more)

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
Cohesion: 0.23
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 27 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, build:dev, build:vercel, dev, electron:build, electron:build:arm64, electron:build:portable:x64 (+4 more)

### Community 28 - "chart.tsx"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 29 - "sheet.tsx"
Cohesion: 0.24
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 30 - "dhivehiTranslator.ts"
Cohesion: 0.47
Nodes (5): DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken(), transliterateEnglishToThaana()

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
Cohesion: 0.31
Nodes (9): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase, @supabase/supabase-js@^2.93.2 (+1 more)

### Community 35 - "printHelper.ts"
Cohesion: 0.43
Nodes (5): findPrinters(), getQz(), initQz(), printViaIframe(), printViaQz()

### Community 36 - "ErrorBoundary.tsx"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "sendTelegramMessage"
Cohesion: 0.26
Nodes (16): calculateExecutiveBriefingData(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup(), handleTelegramBotCommand(), sendGroupSlipSettledNotification(), sendNearExpiryClearanceBroadcast(), sendTelegramMessage() (+8 more)

### Community 39 - "App.tsx"
Cohesion: 0.14
Nodes (10): queryClient, PriceFixDialogProps, Toaster(), ToasterProps, ProductPriceUpdate, AppProviderWithPriceDialog(), PriceFixDialogManager(), resources (+2 more)

### Community 40 - "class-variance-authority"
Cohesion: 0.20
Nodes (11): class-variance-authority@^0.7.1, class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, ToggleGroup, ToggleGroupContext (+3 more)

### Community 41 - "toast.tsx"
Cohesion: 0.27
Nodes (11): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+3 more)

### Community 43 - "llamaService.ts"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 46 - "formatters.ts"
Cohesion: 0.25
Nodes (9): extractDateOnly(), formatCurrency(), getMaldivesParts(), parseMaldivesDate(), toISODatetime(), CartTotals, cleanMaldivesPhone(), formatCartViberMessage() (+1 more)

### Community 48 - "Button"
Cohesion: 0.11
Nodes (115): date-fns, jspdf, jspdf-autotable, lucide-react, react-i18next, App(), AppCloseConfirmDialog(), BankNotificationsDialog() (+107 more)

### Community 50 - "AppContextProvider"
Cohesion: 0.28
Nodes (8): AppContextProvider(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder(), sendAutoTransferToCreditNotification(), cleanMacroPlaceholders(), deduplicateBankNotifications(), parseBankNotificationPayload()

### Community 52 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (7): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme()

## Knowledge Gaps
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `react`, `command.tsx`, `AppContext.tsx`, `POS.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `GSTReports.tsx`, `StockAudit.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `toast.tsx`, `Button`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08735632183908046 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `command.tsx`, `AppContext.tsx`, `cn`, `dependencies`, `POS.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `GSTReports.tsx`, `StockAudit.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `ErrorBoundary.tsx`, `navigation-menu.tsx`, `App.tsx`, `class-variance-authority`, `toast.tsx`, `Button`, `ThemeProvider.tsx`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07586206896551724 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `telegram-webhook.ts` to `build-vercel.mjs`, `package.json`, `StockAudit.tsx`, `POS.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.07624113475177305 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._