# Graph Report - sleepymeerkatglow-main  (2026-11-12)

## Corpus Check
- 175 files · ~207,145 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1093 nodes · 4481 edges · 70 communities (47 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36e3a8b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AddCreditSaleDialog.tsx
- react
- DailySales.tsx
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
- ref_path
- index.ts
- form.tsx
- scripts
- chart.tsx
- sheet.tsx
- dhivehiTranslator.ts
- build-vercel.mjs
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- AppContextProvider
- ErrorBoundary.tsx
- navigation-menu.tsx
- refactor.cjs
- sonner.tsx
- class-variance-authority
- axios@^1.13.2
- clsx
- llamaService.ts
- vercel.json
- @radix-ui/react-alert-dialog
- input-otp
- qrcode.react
- POS.tsx
- @radix-ui/react-dropdown-menu
- input-otp.tsx
- auth.ts
- main.cjs
- @radix-ui/react-navigation-menu
- @radix-ui/react-progress
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- react-resizable-panels
- recharts
- tailwind-merge
- zod@^3.23.8
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @tanstack/react-query
- restore-to-new-supabase.mjs
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
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts
- `PaginationEllipsis()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts
- `DrawerFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/drawer.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (70 total, 23 thin omitted)

### Community 0 - "AddCreditSaleDialog.tsx"
Cohesion: 0.06
Nodes (44): AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, CustomerAddDialogProps, ExcelImportDialogProps, ParsedProduct, SelectedItem, FlavourSelectionDialogProps (+36 more)

### Community 1 - "react"
Cohesion: 0.09
Nodes (21): @radix-ui/react-slider@^1.2.0, lucide-react, @radix-ui/react-slider, react, TransferSlipsDialogProps, AccordionContent, AccordionItem, AccordionTrigger (+13 more)

### Community 2 - "DailySales.tsx"
Cohesion: 0.12
Nodes (44): date-fns, jspdf, jspdf-autotable, react-day-picker, xlsx, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps (+36 more)

### Community 3 - "cn"
Cohesion: 0.07
Nodes (45): Avatar, AvatarFallback, AvatarImage, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList (+37 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, cmdk@^1.0.0, date-fns@^3.6.0, html2pdf.js@^0.14.0, html5-qrcode@^2.3.8, jspdf@^4.0.0, jspdf-autotable@^5.0.7, lucide-react@^0.462.0 (+34 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (39): devDependencies, autoprefixer@^10.4.20, @dyad-sh/react-vite-component-tagger@^0.8.0, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9 (+31 more)

### Community 6 - "AppContext.tsx"
Cohesion: 0.08
Nodes (31): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, Props, AccountingSettings, AppContext, AppContextType, Cart, CustomerDisplayOffer (+23 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.08
Nodes (29): Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+21 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (31): author, embla-carousel-react@^8.3.0, framer-motion@^13.4.4, @hookform/resolvers@^3.9.0, i18next@^25.7.4, jsbarcode@^3.12.3, @radix-ui/react-dialog@^1.1.2, @radix-ui/react-hover-card@^1.1.1 (+23 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "App.tsx"
Cohesion: 0.07
Nodes (33): react-router-dom, AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots() (+25 more)

### Community 12 - "telegramService.ts"
Cohesion: 0.26
Nodes (16): calculateExecutiveBriefingData(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup(), handleTelegramBotCommand(), sendGroupSlipSettledNotification(), sendNearExpiryClearanceBroadcast(), sendTelegramMessage() (+8 more)

### Community 13 - "Admin.tsx"
Cohesion: 0.19
Nodes (19): PWAInstallButton(), Admin(), answerCallbackQuery(), BOT_COMMANDS, checkAndLinkCustomerLive(), DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME, deleteTelegramWebhook() (+11 more)

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

### Community 23 - "main.tsx"
Cohesion: 0.15
Nodes (9): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme(), resources (+1 more)

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

### Community 30 - "dhivehiTranslator.ts"
Cohesion: 0.47
Nodes (5): DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken(), transliterateEnglishToThaana()

### Community 31 - "build-vercel.mjs"
Cohesion: 0.18
Nodes (7): { privateKey, publicKey }, __dirname, indexPath, mainPath, modifiedHtml, originalHtml, rootDir

### Community 32 - "generate-pwa-icons.mjs"
Cohesion: 0.28
Nodes (4): crc32(), createPNG(), makeChunk(), publicDir

### Community 33 - "indexedDb.ts"
Cohesion: 0.36
Nodes (8): clearStore(), deleteStoreItem(), getStoreAll(), openDatabase(), putStoreBatch(), putStoreItem(), StoreName, STORES

### Community 34 - "telegram-webhook.ts"
Cohesion: 0.43
Nodes (7): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase

### Community 35 - "AppContextProvider"
Cohesion: 0.24
Nodes (9): PriceFixDialogProps, AppContextProvider(), ProductPriceUpdate, AppProviderWithPriceDialog(), PriceFixDialogManager(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder() (+1 more)

### Community 36 - "ErrorBoundary.tsx"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "refactor.cjs"
Cohesion: 0.33
Nodes (5): adminPath, content, fs, path, sections

### Community 39 - "sonner.tsx"
Cohesion: 0.29
Nodes (6): next-themes@^0.3.0, sonner@^1.5.0, next-themes, sonner, Toaster(), ToasterProps

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
Cohesion: 0.12
Nodes (107): react-i18next, App(), queryClient, AppCloseConfirmDialog(), BankNotificationsDialog(), CustomerAddDialog(), CustomerDisplayOfferDialog(), ExcelImportDialog() (+99 more)

### Community 50 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 52 - "main.cjs"
Cohesion: 0.18
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { contextBridge, ipcRenderer }, electron@^45.0.0, electron

### Community 68 - "restore-to-new-supabase.mjs"
Cohesion: 0.28
Nodes (8): @supabase/supabase-js@^2.93.2, @supabase/supabase-js, backupDir, main(), [rawUrl, rawKey], restoreImages(), restoreTable(), supabase

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `AddCreditSaleDialog.tsx`, `react`, `DailySales.tsx`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `App.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Should `AddCreditSaleDialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06462585034013606 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AddCreditSaleDialog.tsx`, `DailySales.tsx`, `cn`, `dependencies`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `App.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `main.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AppContextProvider`, `ErrorBoundary.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`, `input-otp.tsx`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08677098150782361 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `AddCreditSaleDialog.tsx`, `DailySales.tsx`, `cn`, `dependencies`, `ErrorBoundary.tsx`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `navigation-menu.tsx`, `package.json`, `sidebar.tsx`, `App.tsx`, `hooks/use-toast.ts`, `Admin.tsx`, `pagination.tsx`, `POS.tsx`, `input-otp.tsx`, `carousel.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `DailySales.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11845584346906399 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._