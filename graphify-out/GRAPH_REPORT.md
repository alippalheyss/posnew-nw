# Graph Report - sleepymeerkatglow-main  (2026-11-09)

## Corpus Check
- 173 files · ~192,868 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1083 nodes · 4411 edges · 82 communities (52 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6f10df5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- react
- DailySales.tsx
- cn
- dependencies
- devDependencies
- AppContext.tsx
- POS.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- ProductDialog.tsx
- telegramService.ts
- AddCreditSaleDialog.tsx
- compilerOptions
- pagination.tsx
- components.json
- manifest.json
- Admin.tsx
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
- restore-to-new-supabase.mjs
- vite.config.ts
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- breadcrumb.tsx
- drawer.tsx
- navigation-menu.tsx
- main.cjs
- sonner.tsx
- toggle-group.tsx
- refactor.cjs
- AppContextProvider
- llamaService.ts
- vercel.json
- ref_path
- refactor_colors.cjs
- prebuild.js
- ErrorBoundary
- alert.tsx
- input-otp.tsx
- auth.ts
- electron
- avatar.tsx
- tabs.tsx
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- switch.tsx
- cmdk
- html2pdf.js@^0.14.0
- html5-qrcode
- input-otp
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-progress
- @radix-ui/react-slot
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- recharts
- tailwind-merge
- tailwindcss-animate@^1.0.7
- @tanstack/react-query
- @types/jsbarcode@^3.11.4
- vaul
- zod@^3.23.8
- jspdf-autotable.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 293 edges
2. `react` - 106 edges
3. `Button` - 102 edges
4. `DialogContent` - 85 edges
5. `Input` - 83 edges
6. `DialogTitle` - 82 edges
7. `DialogHeader()` - 80 edges
8. `DialogDescription` - 78 edges
9. `useAppContext()` - 75 edges
10. `showSuccess()` - 72 edges

## Surprising Connections (you probably didn't know these)
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (82 total, 30 thin omitted)

### Community 0 - "Button"
Cohesion: 0.13
Nodes (99): react-i18next, xlsx, App(), queryClient, BankNotificationsDialog(), CustomerAddDialog(), CustomerDisplayOfferDialog(), ExcelImportDialog() (+91 more)

### Community 1 - "react"
Cohesion: 0.06
Nodes (53): @radix-ui/react-slider@^1.2.0, class-variance-authority, lucide-react, @radix-ui/react-slider, react, react-router-dom, AmbientBackground, BankAlertPill() (+45 more)

### Community 2 - "DailySales.tsx"
Cohesion: 0.12
Nodes (41): date-fns, jspdf, jspdf-autotable, react-day-picker, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps, Calendar() (+33 more)

### Community 3 - "cn"
Cohesion: 0.07
Nodes (44): AccordionContent, AccordionItem, AccordionTrigger, CardFooter, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel (+36 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, class-variance-authority@^0.7.1, date-fns@^3.6.0, @hookform/resolvers@^3.9.0, i18next@^25.7.4, jsbarcode@^3.12.3, jspdf@^4.0.0, jspdf-autotable@^5.0.7 (+33 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (31): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+23 more)

### Community 6 - "AppContext.tsx"
Cohesion: 0.09
Nodes (27): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, AccountingSettings, AppContext, AppContextType, Cart, Expense, ExpenseCategory (+19 more)

### Community 7 - "POS.tsx"
Cohesion: 0.10
Nodes (23): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, ActiveAuditSession, AuditEntry, mergeAuditSessions(), mergeProductItems(), playBeep() (+15 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.08
Nodes (28): SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader (+20 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (29): author, axios@^1.13.2, clsx@^2.1.1, embla-carousel-react@^8.3.0, framer-motion@^13.4.4, qrcode.react@^4.2.0, @radix-ui/react-checkbox@^1.1.1, @radix-ui/react-radio-group@^1.2.0 (+21 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "ProductDialog.tsx"
Cohesion: 0.14
Nodes (21): GoogleIcon(), OnlineImageSearchDialogProps, ProductFlavour, OnlineProductImage, saveOnlineImageToBucket(), searchProductImages(), DICTIONARY, PHONETIC_MAP (+13 more)

### Community 12 - "telegramService.ts"
Cohesion: 0.21
Nodes (24): answerCallbackQuery(), calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), deleteTelegramWebhook(), ExecutiveBriefingData, formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup() (+16 more)

### Community 13 - "AddCreditSaleDialog.tsx"
Cohesion: 0.16
Nodes (20): AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, CustomerAddDialogProps, NearExpiryBroadcastDialogProps, TelegramConnectDialogProps, Command, CommandDialog() (+12 more)

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

### Community 18 - "Admin.tsx"
Cohesion: 0.18
Nodes (14): Props, PWAInstallButton(), Separator, CustomerDisplayOffer, Database, Admin(), BOT_COMMANDS, DEFAULT_TELEGRAM_BOT_TOKEN (+6 more)

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
Cohesion: 0.17
Nodes (8): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, resources, updateSW

### Community 24 - "build-vercel.mjs"
Cohesion: 0.18
Nodes (7): { privateKey, publicKey }, __dirname, indexPath, mainPath, modifiedHtml, originalHtml, rootDir

### Community 25 - "index.ts"
Cohesion: 0.18
Nodes (4): corsHeaders, getGroupOrOwnerChatId(), getTelegramGroupConfig(), supabase

### Community 26 - "form.tsx"
Cohesion: 0.23
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 27 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:dev, build:vercel, dev, electron:build, electron:build:arm64, electron:build:x64 (+3 more)

### Community 28 - "chart.tsx"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 29 - "sheet.tsx"
Cohesion: 0.24
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 30 - "restore-to-new-supabase.mjs"
Cohesion: 0.28
Nodes (8): @supabase/supabase-js@^2.93.2, @supabase/supabase-js, backupDir, main(), [rawUrl, rawKey], restoreImages(), restoreTable(), supabase

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

### Community 36 - "drawer.tsx"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "main.cjs"
Cohesion: 0.29
Nodes (4): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url

### Community 39 - "sonner.tsx"
Cohesion: 0.29
Nodes (6): next-themes@^0.3.0, sonner@^1.5.0, next-themes, sonner, Toaster(), ToasterProps

### Community 40 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 41 - "refactor.cjs"
Cohesion: 0.33
Nodes (5): adminPath, content, fs, path, sections

### Community 42 - "AppContextProvider"
Cohesion: 0.33
Nodes (6): useTheme(), AppContextProvider(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder(), sendAutoTransferToCreditNotification()

### Community 43 - "llamaService.ts"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 46 - "refactor_colors.cjs"
Cohesion: 0.40
Nodes (4): files, fs, path, walkSync()

### Community 47 - "prebuild.js"
Cohesion: 0.40
Nodes (4): fs, html, indexPath, path

### Community 49 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 50 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 52 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

### Community 53 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 54 - "tabs.tsx"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `Button`, `react`, `DailySales.tsx`, `AppContext.tsx`, `POS.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `ProductDialog.tsx`, `AddCreditSaleDialog.tsx`, `pagination.tsx`, `Admin.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `toggle-group.tsx`, `alert.tsx`, `input-otp.tsx`, `avatar.tsx`, `tabs.tsx`, `switch.tsx`?**
  _High betweenness centrality (0.219) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.1302884075861295 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Button`, `DailySales.tsx`, `cn`, `dependencies`, `AppContext.tsx`, `POS.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `ProductDialog.tsx`, `AddCreditSaleDialog.tsx`, `pagination.tsx`, `Admin.tsx`, `carousel.tsx`, `main.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `toggle-group.tsx`, `alert.tsx`, `input-otp.tsx`, `avatar.tsx`, `tabs.tsx`, `switch.tsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.058254963427377224 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `restore-to-new-supabase.mjs` to `package.json`, `telegram-webhook.ts`, `react`, `AppContext.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `DailySales.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06787330316742081 - nodes in this community are weakly interconnected._