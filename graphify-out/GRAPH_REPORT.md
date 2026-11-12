# Graph Report - sleepymeerkatglow-main  (2026-11-12)

## Corpus Check
- 175 files · ~198,366 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1092 nodes · 4483 edges · 69 communities (46 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9df58518`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- ProductDialog.tsx
- DailySales.tsx
- cn
- dependencies
- devDependencies
- AppContext.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- AuthContext.tsx
- telegramService.ts
- Admin.tsx
- compilerOptions
- pagination.tsx
- components.json
- manifest.json
- ErrorBoundary.tsx
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
- AppContextProvider
- vite.config.ts
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- breadcrumb.tsx
- drawer.tsx
- navigation-menu.tsx
- supabase.ts
- sonner.tsx
- class-variance-authority
- axios@^1.13.2
- framer-motion
- llamaService.ts
- vercel.json
- i18next
- html2pdf.js@^0.14.0
- @radix-ui/react-hover-card
- POS.tsx
- @radix-ui/react-label
- utils.ts
- auth.ts
- electron
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-scroll-area
- @radix-ui/react-progress
- @radix-ui/react-select
- @radix-ui/react-switch
- tailwindcss-animate@^1.0.7
- zod@^3.23.8
- react-dom
- jspdf-autotable.d.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 293 edges
2. `react` - 108 edges
3. `Button` - 106 edges
4. `DialogContent` - 89 edges
5. `DialogTitle` - 86 edges
6. `Input` - 85 edges
7. `DialogHeader()` - 84 edges
8. `DialogDescription` - 82 edges
9. `useAppContext()` - 77 edges
10. `showError()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `ProductDialogProps` --references--> `Product`  [EXTRACTED]
  src/components/ProductDialog.tsx → src/context/AppContext.tsx
- `Admin()` --calls--> `Database`  [EXTRACTED]
  src/pages/Admin.tsx → src/lib/supabase.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (69 total, 23 thin omitted)

### Community 0 - "react"
Cohesion: 0.10
Nodes (89): lucide-react, react, react-i18next, AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, AppCloseConfirmDialog(), CustomerAddDialog() (+81 more)

### Community 1 - "ProductDialog.tsx"
Cohesion: 0.16
Nodes (16): ProductDialogProps, supabaseUrl, OnlineProductImage, saveOnlineImageToBucket(), DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken() (+8 more)

### Community 2 - "DailySales.tsx"
Cohesion: 0.13
Nodes (42): date-fns, jspdf, jspdf-autotable, react-day-picker, xlsx, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps (+34 more)

### Community 3 - "cn"
Cohesion: 0.07
Nodes (45): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, CommandList (+37 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, cmdk@^1.0.0, date-fns@^3.6.0, embla-carousel-react@^8.3.0, @hookform/resolvers@^3.9.0, html5-qrcode@^2.3.8, jsbarcode@^3.12.3, jspdf@^4.0.0 (+38 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (33): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+25 more)

### Community 6 - "AppContext.tsx"
Cohesion: 0.08
Nodes (27): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, Props, AccountingSettings, AppContext, AppContextType, Cart, CustomerDisplayOffer (+19 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (33): author, clsx@^2.1.1, input-otp@^1.2.4, @radix-ui/react-accordion@^1.2.0, @radix-ui/react-alert-dialog@^1.1.1, @radix-ui/react-avatar@^1.1.0, @radix-ui/react-separator@^1.1.0, @radix-ui/react-toast@^1.2.1 (+25 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "AuthContext.tsx"
Cohesion: 0.13
Nodes (19): AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots(), PulsatingDotsProps (+11 more)

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

### Community 18 - "ErrorBoundary.tsx"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

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
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 30 - "AppContextProvider"
Cohesion: 0.24
Nodes (9): PriceFixDialogProps, AppContextProvider(), ProductPriceUpdate, AppProviderWithPriceDialog(), PriceFixDialogManager(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder() (+1 more)

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
Cohesion: 0.31
Nodes (9): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase, @supabase/supabase-js@^2.93.2 (+1 more)

### Community 35 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 36 - "drawer.tsx"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "supabase.ts"
Cohesion: 0.29
Nodes (5): Database, DEFAULT_SETTINGS_USER_ID, supabase, supabaseAnonKey, SalesSummaryMetrics

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
Nodes (69): react-router-dom, App(), queryClient, BankNotificationsDialog(), ExcelImportDialog(), DraftPurchaseItem, isProductZeroTax(), LocalPurchaseWindow() (+61 more)

### Community 50 - "utils.ts"
Cohesion: 0.09
Nodes (14): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, HoverCardContent, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, RadioGroup (+6 more)

### Community 52 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `react`, `ProductDialog.tsx`, `DailySales.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `AuthContext.tsx`, `Admin.tsx`, `pagination.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`, `utils.ts`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.09630064591896653 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `ProductDialog.tsx`, `DailySales.tsx`, `cn`, `dependencies`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `AuthContext.tsx`, `Admin.tsx`, `pagination.tsx`, `ErrorBoundary.tsx`, `carousel.tsx`, `main.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AppContextProvider`, `breadcrumb.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`, `utils.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `DailySales.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12844611528822056 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `telegram-webhook.ts` to `build-vercel.mjs`, `package.json`, `AuthContext.tsx`, `supabase.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06745098039215686 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._