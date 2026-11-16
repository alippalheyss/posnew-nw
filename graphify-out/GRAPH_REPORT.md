# Graph Report - sleepymeerkatglow-main  (2026-11-16)

## Corpus Check
- 181 files · ~487,547 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1141 nodes · 4710 edges · 72 communities (48 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f9969ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Layout.tsx
- ProductDialog.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- Shop.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- main.tsx
- react
- build-vercel.mjs
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
- ref_path
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
- DailySales.tsx
- command.tsx
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
- @radix-ui/react-dropdown-menu
- main.cjs
- auth.ts
- slider.tsx
- next-themes
- qrcode.react
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-navigation-menu
- embla-carousel-react
- @radix-ui/react-scroll-area
- @radix-ui/react-switch
- recharts
- zod@^3.23.8
- @radix-ui/react-toast
- react-resizable-panels
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

## Communities (72 total, 24 thin omitted)

### Community 0 - "Layout.tsx"
Cohesion: 0.24
Nodes (8): AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots(), PulsatingDotsProps

### Community 1 - "ProductDialog.tsx"
Cohesion: 0.15
Nodes (19): ProductFlavour, OnlineProductImage, saveOnlineImageToBucket(), searchProductImages(), DICTIONARY, PHONETIC_MAP, translateEnglishToDhivehi(), translateToken() (+11 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.08
Nodes (30): BankNotificationsDialogProps, PriceFixDialogProps, AccountingSettings, AppContext, AppContextProvider(), AppContextType, Cart, DayOfWeekKey (+22 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (52): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, ContextMenuCheckboxItem (+44 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, axios@^1.13.2, cmdk@^1.0.0, date-fns@^3.6.0, @hookform/resolvers@^3.9.0, input-otp@^1.2.4, jsbarcode@^3.12.3, jspdf@^4.0.0 (+36 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (31): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+23 more)

### Community 6 - "Shop.tsx"
Cohesion: 0.17
Nodes (27): ShopSettings, Shop(), STATUS_BADGE_MAP, checkRegistrationStatus(), codesMatch(), completeShopPasswordSetup(), fetchCustomerOrders(), fetchPublicShopData() (+19 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (33): author, html2pdf.js@^0.14.0, html5-qrcode@^2.3.8, i18next@^25.7.4, @radix-ui/react-alert-dialog@^1.1.1, @radix-ui/react-checkbox@^1.1.1, @radix-ui/react-hover-card@^1.1.1, @radix-ui/react-popover@^1.1.1 (+25 more)

### Community 10 - "main.tsx"
Cohesion: 0.12
Nodes (11): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme(), Toaster() (+3 more)

### Community 11 - "react"
Cohesion: 0.14
Nodes (53): react-router-dom, App(), queryClient, DraftPurchaseItem, isProductZeroTax(), LocalPurchaseWindow(), Badge(), BadgeProps (+45 more)

### Community 12 - "build-vercel.mjs"
Cohesion: 0.18
Nodes (7): { privateKey, publicKey }, __dirname, indexPath, mainPath, modifiedHtml, originalHtml, rootDir

### Community 13 - "Admin.tsx"
Cohesion: 0.15
Nodes (16): Props, Switch, UserDialogProps, CustomerDisplayOffer, User, Admin(), DAY_ORDER, DEFAULT_WEEKLY_OPENING_HOURS (+8 more)

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
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 30 - "AuthContext.tsx"
Cohesion: 0.16
Nodes (13): BANK_WEBHOOK_ROW_ID, adminPermissions, AuthContext, AuthContextType, cashierPermissions, pendingUserRequests, UserPermissions, Database (+5 more)

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
Cohesion: 0.12
Nodes (46): date-fns, jspdf, jspdf-autotable, react-day-picker, xlsx, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps (+38 more)

### Community 36 - "command.tsx"
Cohesion: 0.20
Nodes (10): Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+2 more)

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "telegramService.ts"
Cohesion: 0.16
Nodes (30): answerCallbackQuery(), calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), deleteTelegramWebhook(), ExecutiveBriefingData, formatAutoTransferToCreditMessage(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage() (+22 more)

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

### Community 48 - "Button"
Cohesion: 0.08
Nodes (109): lucide-react, react, react-i18next, AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, AppCloseConfirmDialog(), BankNotificationsDialog() (+101 more)

### Community 50 - "main.cjs"
Cohesion: 0.18
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { contextBridge, ipcRenderer }, electron@^45.0.0, electron

### Community 52 - "slider.tsx"
Cohesion: 0.50
Nodes (3): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, Slider

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `ProductDialog.tsx`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `react`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AuthContext.tsx`, `breadcrumb.tsx`, `DailySales.tsx`, `command.tsx`, `navigation-menu.tsx`, `hooks/use-toast.ts`, `class-variance-authority`, `Button`, `slider.tsx`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08143939393939394 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Button` to `Layout.tsx`, `ProductDialog.tsx`, `AppContext.tsx`, `cn`, `dependencies`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `main.tsx`, `react`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AuthContext.tsx`, `breadcrumb.tsx`, `DailySales.tsx`, `command.tsx`, `navigation-menu.tsx`, `hooks/use-toast.ts`, `class-variance-authority`, `slider.tsx`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05552617662612375 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Button` to `Layout.tsx`, `ProductDialog.tsx`, `cn`, `dependencies`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `react`, `Admin.tsx`, `pagination.tsx`, `carousel.tsx`, `sheet.tsx`, `AuthContext.tsx`, `breadcrumb.tsx`, `DailySales.tsx`, `command.tsx`, `navigation-menu.tsx`, `hooks/use-toast.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06818181818181818 - nodes in this community are weakly interconnected._