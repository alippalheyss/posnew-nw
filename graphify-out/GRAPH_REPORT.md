# Graph Report - sleepymeerkatglow-main  (2026-11-16)

## Corpus Check
- 182 files · ~490,224 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1149 nodes · 4728 edges · 81 communities (48 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d20d57d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Layout.tsx
- toast.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- Shop.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- main.tsx
- utils.ts
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
- AuthContext.tsx
- breadcrumb.tsx
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- DailySales.tsx
- ThemeProvider.tsx
- navigation-menu.tsx
- telegramService.ts
- hooks/use-toast.ts
- class-variance-authority
- restore-to-new-supabase.mjs
- tailwindcss
- llamaService.ts
- vercel.json
- refactor.cjs
- ErrorBoundary
- framer-motion
- Button
- @radix-ui/react-dropdown-menu
- main.cjs
- auth.ts
- @radix-ui/react-slider
- next-themes
- qrcode.react
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-navigation-menu
- cmdk
- @radix-ui/react-scroll-area
- @radix-ui/react-switch
- recharts
- html5-qrcode
- i18next
- input-otp
- @radix-ui/react-alert-dialog
- @radix-ui/react-checkbox
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-popover
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- sonner
- @types/jsbarcode@^3.11.4
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
- `App()` --calls--> `NotFound()`  [EXTRACTED]
  src/App.tsx → src/pages/NotFound.tsx
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

## Communities (81 total, 33 thin omitted)

### Community 0 - "Layout.tsx"
Cohesion: 0.26
Nodes (10): react, AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots() (+2 more)

### Community 1 - "toast.tsx"
Cohesion: 0.35
Nodes (9): Toast, ToastAction, ToastClose, ToastDescription, ToastTitle, toastVariants, ToastViewport, Toaster() (+1 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.10
Nodes (23): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, AccountingSettings, AppContext, AppContextType, Cart, Expense, ExpenseCategory (+15 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (50): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, ContextMenuCheckboxItem (+42 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, date-fns@^3.6.0, embla-carousel-react@^8.3.0, jsbarcode@^3.12.3, jspdf@^4.0.0, jspdf-autotable@^5.0.7, lucide-react@^0.462.0, @radix-ui/react-accordion@^1.2.0 (+30 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (29): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+21 more)

### Community 6 - "Shop.tsx"
Cohesion: 0.05
Nodes (72): AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, CustomerAddDialogProps, NearExpiryBroadcastDialogProps, OnlineOrdersDialogProps, PendingRegistrationsDialogProps, ShopHelperMascot() (+64 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (27): author, axios@^1.13.2, clsx@^2.1.1, @hookform/resolvers@^3.9.0, html2pdf.js@^0.14.0, @radix-ui/react-avatar@^1.1.0, @radix-ui/react-toggle@^1.1.0, react-resizable-panels@^2.1.3 (+19 more)

### Community 10 - "main.tsx"
Cohesion: 0.21
Nodes (6): queryClient, Toaster(), ToasterProps, AuthProvider(), resources, updateSW

### Community 11 - "utils.ts"
Cohesion: 0.07
Nodes (65): react-router-dom, Props, ExcelImportDialog(), ExcelImportDialogProps, ParsedProduct, SelectedItem, FlavourSelectionDialogProps, DraftPurchaseItem (+57 more)

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

### Community 30 - "AuthContext.tsx"
Cohesion: 0.19
Nodes (11): UserDialogProps, adminPermissions, AuthContext, AuthContextType, cashierPermissions, pendingUserRequests, useAuth(), User (+3 more)

### Community 31 - "breadcrumb.tsx"
Cohesion: 0.20
Nodes (9): @radix-ui/react-slot@^1.1.0, @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage (+1 more)

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
Cohesion: 0.10
Nodes (64): date-fns, jspdf, jspdf-autotable, react-day-picker, xlsx, App(), InvoiceViewDialog(), InvoiceViewDialogProps (+56 more)

### Community 36 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (7): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme()

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "telegramService.ts"
Cohesion: 0.15
Nodes (31): answerCallbackQuery(), BOT_COMMANDS, calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME, deleteTelegramWebhook(), ExecutiveBriefingData (+23 more)

### Community 39 - "hooks/use-toast.ts"
Cohesion: 0.16
Nodes (16): ToastActionElement, ToastProps, Action, ActionType, _actionTypes, addToRemoveQueue(), dispatch(), genId() (+8 more)

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
Cohesion: 0.12
Nodes (82): lucide-react, react-i18next, AppCloseConfirmDialog(), BankNotificationsDialog(), CustomerAddDialog(), CustomerDisplayOfferDialog(), ExpiryUpdateDialog(), ExpiryUpdateDialogProps (+74 more)

### Community 50 - "main.cjs"
Cohesion: 0.18
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `Layout.tsx`, `toast.tsx`, `DailySales.tsx`, `navigation-menu.tsx`, `Shop.tsx`, `PosShortcutSettings.tsx`, `class-variance-authority`, `sidebar.tsx`, `utils.ts`, `pagination.tsx`, `Button`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09666666666666666 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Layout.tsx` to `toast.tsx`, `AppContext.tsx`, `cn`, `dependencies`, `Shop.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `utils.ts`, `AppContextProvider`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `AuthContext.tsx`, `breadcrumb.tsx`, `DailySales.tsx`, `ThemeProvider.tsx`, `navigation-menu.tsx`, `hooks/use-toast.ts`, `class-variance-authority`, `ErrorBoundary`, `Button`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05737704918032787 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `restore-to-new-supabase.mjs` to `package.json`, `telegram-webhook.ts`, `AuthContext.tsx`, `Shop.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07586206896551724 - nodes in this community are weakly interconnected._