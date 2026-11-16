# Graph Report - sleepymeerkatglow-main  (2026-11-16)

## Corpus Check
- 182 files · ~491,242 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1151 nodes · 4740 edges · 72 communities (47 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `705440a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Layout.tsx
- AddCreditSaleDialog.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- Shop.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- main.tsx
- dhivehiTranslator.ts
- build-vercel.mjs
- AppContextProvider
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
- ref_path
- index.ts
- form.tsx
- scripts
- chart.tsx
- sheet.tsx
- input-otp.tsx
- breadcrumb.tsx
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- DailySales.tsx
- axios@^1.13.2
- navigation-menu.tsx
- telegramService.ts
- hooks/use-toast.ts
- class-variance-authority
- restore-to-new-supabase.mjs
- clsx
- llamaService.ts
- vercel.json
- refactor.cjs
- ErrorBoundary
- framer-motion
- Button
- @radix-ui/react-progress
- main.cjs
- auth.ts
- @radix-ui/react-slider
- @radix-ui/react-radio-group
- qrcode.react
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-select
- @radix-ui/react-toast
- @radix-ui/react-toggle
- react-dom
- react-resizable-panels
- html5-qrcode
- tailwindcss-animate@^1.0.7
- input-otp
- @radix-ui/react-menubar
- sonner
- jspdf-autotable.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 299 edges
2. `react` - 112 edges
3. `Button` - 112 edges
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

## Communities (72 total, 25 thin omitted)

### Community 0 - "Layout.tsx"
Cohesion: 0.12
Nodes (21): AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots(), PulsatingDotsProps (+13 more)

### Community 1 - "AddCreditSaleDialog.tsx"
Cohesion: 0.21
Nodes (15): AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup (+7 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.08
Nodes (29): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, Props, AccountingSettings, AppContext, AppContextType, Cart, CustomerDisplayOffer (+21 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (48): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, ContextMenuCheckboxItem (+40 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, date-fns@^3.6.0, jsbarcode@^3.12.3, jspdf@^4.0.0, jspdf-autotable@^5.0.7, lucide-react@^0.462.0, next-themes@^0.3.0, @radix-ui/react-alert-dialog@^1.1.1 (+36 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (31): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+23 more)

### Community 6 - "Shop.tsx"
Cohesion: 0.05
Nodes (68): ExcelImportDialogProps, ParsedProduct, SelectedItem, FlavourSelectionDialogProps, OnlineOrdersDialogProps, ProductDialogProps, ProductPickerDialogProps, SelectedItem (+60 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (29): Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+21 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (31): author, cmdk@^1.0.0, embla-carousel-react@^8.3.0, @hookform/resolvers@^3.9.0, html2pdf.js@^0.14.0, i18next@^25.7.4, @radix-ui/react-accordion@^1.2.0, @radix-ui/react-hover-card@^1.1.1 (+23 more)

### Community 10 - "main.tsx"
Cohesion: 0.12
Nodes (11): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme(), Toaster() (+3 more)

### Community 11 - "dhivehiTranslator.ts"
Cohesion: 0.47
Nodes (5): DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken(), transliterateEnglishToThaana()

### Community 12 - "build-vercel.mjs"
Cohesion: 0.18
Nodes (7): { privateKey, publicKey }, __dirname, indexPath, mainPath, modifiedHtml, originalHtml, rootDir

### Community 13 - "AppContextProvider"
Cohesion: 0.24
Nodes (9): PriceFixDialogProps, AppContextProvider(), ProductPriceUpdate, AppProviderWithPriceDialog(), PriceFixDialogManager(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder() (+1 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "pagination.tsx"
Cohesion: 0.13
Nodes (18): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+10 more)

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

### Community 24 - "ref_path"
Cohesion: 0.14
Nodes (10): png-to-ico@^3.0.2, png-to-ico, files, fs, path, walkSync(), fs, html (+2 more)

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
Cohesion: 0.24
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 30 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

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

### Community 35 - "DailySales.tsx"
Cohesion: 0.08
Nodes (93): date-fns, jspdf, jspdf-autotable, react, react-day-picker, react-i18next, react-router-dom, xlsx (+85 more)

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "telegramService.ts"
Cohesion: 0.13
Nodes (35): Admin(), answerCallbackQuery(), BOT_COMMANDS, calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME, deleteTelegramWebhook() (+27 more)

### Community 39 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 40 - "class-variance-authority"
Cohesion: 0.20
Nodes (11): class-variance-authority@^0.7.1, class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, ToggleGroup, ToggleGroupContext (+3 more)

### Community 41 - "restore-to-new-supabase.mjs"
Cohesion: 0.28
Nodes (8): @supabase/supabase-js@^2.93.2, @supabase/supabase-js, backupDir, main(), [rawUrl, rawKey], restoreImages(), restoreTable(), supabase

### Community 43 - "llamaService.ts"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 45 - "refactor.cjs"
Cohesion: 0.33
Nodes (5): adminPath, content, fs, path, sections

### Community 46 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 48 - "Button"
Cohesion: 0.11
Nodes (94): lucide-react, AppCloseConfirmDialog(), BankNotificationsDialog(), CustomerAddDialog(), CustomerAddDialogProps, CustomerDisplayOfferDialog(), ExcelImportDialog(), ExpiryUpdateDialog() (+86 more)

### Community 50 - "main.cjs"
Cohesion: 0.18
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `Layout.tsx`, `AddCreditSaleDialog.tsx`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `input-otp.tsx`, `breadcrumb.tsx`, `DailySales.tsx`, `navigation-menu.tsx`, `telegramService.ts`, `hooks/use-toast.ts`, `class-variance-authority`, `Button`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Should `Layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Why does `react` connect `DailySales.tsx` to `Layout.tsx`, `AddCreditSaleDialog.tsx`, `AppContext.tsx`, `cn`, `dependencies`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `main.tsx`, `AppContextProvider`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `input-otp.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `hooks/use-toast.ts`, `class-variance-authority`, `ErrorBoundary`, `Button`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07526881720430108 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Button` to `Layout.tsx`, `AddCreditSaleDialog.tsx`, `DailySales.tsx`, `dependencies`, `cn`, `Shop.tsx`, `PosShortcutSettings.tsx`, `navigation-menu.tsx`, `package.json`, `sidebar.tsx`, `hooks/use-toast.ts`, `ErrorBoundary`, `pagination.tsx`, `carousel.tsx`, `sheet.tsx`, `input-otp.tsx`, `breadcrumb.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05989110707803993 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._