# Graph Report - sleepymeerkatglow-main  (2026-11-12)

## Corpus Check
- 175 files · ~203,649 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1092 nodes · 4480 edges · 74 communities (44 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68b9a4f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- ProductDialog.tsx
- printHelper.ts
- cn
- dependencies
- devDependencies
- AppContext.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- App.tsx
- telegramService.ts
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
- main.tsx
- build-vercel.mjs
- index.ts
- form.tsx
- scripts
- chart.tsx
- sheet.tsx
- dhivehiTranslator.ts
- vite.config.ts
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- breadcrumb.tsx
- Sale
- navigation-menu.tsx
- html5-qrcode
- sonner
- class-variance-authority
- jsbarcode
- @radix-ui/react-accordion
- llamaService.ts
- vercel.json
- @radix-ui/react-alert-dialog
- cmdk
- @hookform/resolvers@^3.9.0
- POS.tsx
- @radix-ui/react-label
- input-otp.tsx
- auth.ts
- electron
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-popover
- @radix-ui/react-select
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- react-hook-form
- @radix-ui/react-toast
- tailwindcss-animate@^1.0.7
- @radix-ui/react-toggle-group
- @tanstack/react-query
- @supabase/supabase-js
- jspdf-autotable.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 293 edges
2. `react` - 108 edges
3. `Button` - 106 edges
4. `DialogContent` - 91 edges
5. `DialogTitle` - 88 edges
6. `Input` - 87 edges
7. `DialogHeader()` - 86 edges
8. `DialogDescription` - 82 edges
9. `useAppContext()` - 77 edges
10. `showError()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `ExcelImportDialogProps` --references--> `Product`  [EXTRACTED]
  src/components/ExcelImportDialog.tsx → src/context/AppContext.tsx
- `ParsedProduct` --references--> `Product`  [EXTRACTED]
  src/components/ExcelImportDialog.tsx → src/context/AppContext.tsx
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (74 total, 30 thin omitted)

### Community 0 - "react"
Cohesion: 0.07
Nodes (69): date-fns, lucide-react, react, react-i18next, AddCreditSaleDialogProps, NewCreditSale, CustomerAddDialogProps, ExpiryUpdateDialogProps (+61 more)

### Community 1 - "ProductDialog.tsx"
Cohesion: 0.11
Nodes (22): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, COLOR_MAP, ColorTheme, COMMON_PRESETS, createFallbackProductCardDataUrl(), ImageTextStampDialogProps, StylePreset (+14 more)

### Community 2 - "printHelper.ts"
Cohesion: 0.43
Nodes (5): findPrinters(), getQz(), initQz(), printViaIframe(), printViaQz()

### Community 3 - "cn"
Cohesion: 0.06
Nodes (51): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, CommandList (+43 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, axios@^1.13.2, date-fns@^3.6.0, embla-carousel-react@^8.3.0, html2pdf.js@^0.14.0, i18next@^25.7.4, jspdf@^4.0.0, jspdf-autotable@^5.0.7 (+32 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+25 more)

### Community 6 - "AppContext.tsx"
Cohesion: 0.09
Nodes (25): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, Props, AccountingSettings, AppContext, AppContextType, Cart, CustomerDisplayOffer (+17 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (28): SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader (+20 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (29): author, clsx@^2.1.1, framer-motion@^13.4.4, input-otp@^1.2.4, next-themes@^0.3.0, @radix-ui/react-dropdown-menu@^2.1.1, @radix-ui/react-menubar@^1.1.1, @radix-ui/react-progress@^1.1.0 (+21 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "App.tsx"
Cohesion: 0.08
Nodes (29): react-router-dom, queryClient, AmbientBackground, BankAlertPill(), ErrorBoundary, Props, State, Layout() (+21 more)

### Community 12 - "telegramService.ts"
Cohesion: 0.17
Nodes (27): answerCallbackQuery(), calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), ExecutiveBriefingData, formatAutoTransferToCreditMessage(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), formatPoliteCreditReminderMessage() (+19 more)

### Community 13 - "Admin.tsx"
Cohesion: 0.16
Nodes (16): PWAInstallButton(), Database, supabase, supabaseUrl, Admin(), SalesSummaryMetrics, BOT_COMMANDS, DEFAULT_TELEGRAM_BOT_TOKEN (+8 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "pagination.tsx"
Cohesion: 0.12
Nodes (19): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+11 more)

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

### Community 23 - "main.tsx"
Cohesion: 0.13
Nodes (14): PriceFixDialogProps, initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme() (+6 more)

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
Cohesion: 0.20
Nodes (11): @radix-ui/react-dialog@^1.1.2, @radix-ui/react-dialog, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+3 more)

### Community 30 - "dhivehiTranslator.ts"
Cohesion: 0.47
Nodes (5): DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken(), transliterateEnglishToThaana()

### Community 31 - "vite.config.ts"
Cohesion: 0.22
Nodes (8): @dyad-sh/react-vite-component-tagger@^0.8.0, vite@^6.3.4, vite-plugin-pwa@^1.3.0, @vitejs/plugin-react-swc@^3.9.0, @dyad-sh/react-vite-component-tagger, vite, vite-plugin-pwa, @vitejs/plugin-react-swc

### Community 32 - "generate-pwa-icons.mjs"
Cohesion: 0.28
Nodes (4): crc32(), createPNG(), makeChunk(), publicDir

### Community 33 - "indexedDb.ts"
Cohesion: 0.36
Nodes (8): clearStore(), deleteStoreItem(), getStoreAll(), openDatabase(), putStoreBatch(), putStoreItem(), StoreName, STORES

### Community 34 - "telegram-webhook.ts"
Cohesion: 0.43
Nodes (7): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase

### Community 35 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 36 - "Sale"
Cohesion: 0.50
Nodes (4): InvoiceViewDialogProps, SaleEditDialogProps, SaleReturnDialogProps, Sale

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 40 - "class-variance-authority"
Cohesion: 0.20
Nodes (11): class-variance-authority@^0.7.1, class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, ToggleGroup, ToggleGroupContext (+3 more)

### Community 43 - "llamaService.ts"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 48 - "POS.tsx"
Cohesion: 0.13
Nodes (113): jspdf, jspdf-autotable, react-day-picker, xlsx, App(), AddCreditSaleDialog(), AppCloseConfirmDialog(), BankNotificationsDialog() (+105 more)

### Community 50 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 52 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `react`, `ProductDialog.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `PosShortcutSettings.tsx`, `class-variance-authority`, `sidebar.tsx`, `hooks/use-toast.ts`, `App.tsx`, `Admin.tsx`, `pagination.tsx`, `POS.tsx`, `drawer.tsx`, `input-otp.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.0671751968503937 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `ProductDialog.tsx`, `cn`, `dependencies`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `App.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `main.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Should `ProductDialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10541310541310542 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `@supabase/supabase-js` to `telegram-webhook.ts`, `package.json`, `App.tsx`, `Admin.tsx`, `build-vercel.mjs`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05573770491803279 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._