# Graph Report - sleepymeerkatglow-main  (2026-11-10)

## Corpus Check
- 173 files · ~193,726 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1085 nodes · 4414 edges · 67 communities (45 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fcf58074`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- POS.tsx
- DailySales.tsx
- cn
- dependencies
- devDependencies
- AppContext.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- UserDialog.tsx
- telegramService.ts
- command.tsx
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
- CreditOutstanding.tsx
- Layout.tsx
- generate-pwa-icons.mjs
- indexedDb.ts
- telegram-webhook.ts
- dropdown-menu.tsx
- drawer.tsx
- navigation-menu.tsx
- html5-qrcode
- sonner.tsx
- class-variance-authority
- @radix-ui/react-alert-dialog
- @radix-ui/react-popover
- llamaService.ts
- vercel.json
- @radix-ui/react-select
- @radix-ui/react-switch
- @radix-ui/react-tooltip
- utils.ts
- react-resizable-panels
- input-otp.tsx
- auth.ts
- electron
- tailwindcss-animate@^1.0.7
- @radix-ui/react-hover-card
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-navigation-menu
- @radix-ui/react-progress
- vaul
- @tanstack/react-query
- @radix-ui/react-scroll-area
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
- `Admin()` --calls--> `Database`  [EXTRACTED]
  src/pages/Admin.tsx → src/lib/supabase.ts
- `CommandShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (67 total, 22 thin omitted)

### Community 0 - "react"
Cohesion: 0.11
Nodes (95): lucide-react, react, react-i18next, AddCreditSaleDialog(), AddCreditSaleDialogProps, BankNotificationsDialog(), CustomerAddDialog(), CustomerAddDialogProps (+87 more)

### Community 1 - "POS.tsx"
Cohesion: 0.09
Nodes (43): NewCreditSale, ProductDialog(), DropdownMenuContent, DropdownMenuItem, ScrollBar, SelectContent, SelectItem, SelectScrollDownButton (+35 more)

### Community 2 - "DailySales.tsx"
Cohesion: 0.14
Nodes (39): date-fns, jspdf, jspdf-autotable, react-day-picker, xlsx, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps (+31 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (48): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Breadcrumb, BreadcrumbEllipsis() (+40 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, axios@^1.13.2, clsx@^2.1.1, cmdk@^1.0.0, date-fns@^3.6.0, embla-carousel-react@^8.3.0, framer-motion@^13.4.4, i18next@^25.7.4 (+38 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (39): devDependencies, autoprefixer@^10.4.20, @dyad-sh/react-vite-component-tagger@^0.8.0, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9 (+31 more)

### Community 6 - "AppContext.tsx"
Cohesion: 0.08
Nodes (26): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, AccountingSettings, AppContext, AppContextType, Cart, Expense, ExpenseCategory (+18 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.08
Nodes (28): Separator, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+20 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (33): author, @hookform/resolvers@^3.9.0, html2pdf.js@^0.14.0, jsbarcode@^3.12.3, qrcode.react@^4.2.0, @radix-ui/react-accordion@^1.2.0, @radix-ui/react-avatar@^1.1.0, @radix-ui/react-checkbox@^1.1.1 (+25 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "UserDialog.tsx"
Cohesion: 0.14
Nodes (13): UserDialogProps, adminPermissions, AuthContext, AuthContextType, cashierPermissions, pendingUserRequests, User, UserPermissions (+5 more)

### Community 12 - "telegramService.ts"
Cohesion: 0.20
Nodes (24): answerCallbackQuery(), calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), ExecutiveBriefingData, formatAutoTransferToCreditMessage(), formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup() (+16 more)

### Community 13 - "command.tsx"
Cohesion: 0.22
Nodes (9): Command, CommandDialog(), CommandDialogProps, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+1 more)

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
Cohesion: 0.20
Nodes (14): Props, PWAInstallButton(), CustomerDisplayOffer, Admin(), BOT_COMMANDS, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_BOT_USERNAME, deleteTelegramWebhook() (+6 more)

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
Nodes (32): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { privateKey, publicKey }, png-to-ico@^3.0.2, png-to-ico, adminPath (+24 more)

### Community 25 - "index.ts"
Cohesion: 0.18
Nodes (4): corsHeaders, getGroupOrOwnerChatId(), getTelegramGroupConfig(), supabase

### Community 26 - "form.tsx"
Cohesion: 0.14
Nodes (16): @radix-ui/react-label@^2.1.0, @radix-ui/react-slot@^1.1.0, react-hook-form@^7.53.0, @radix-ui/react-label, @radix-ui/react-slot, react-hook-form, FormControl, FormDescription (+8 more)

### Community 27 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:dev, build:vercel, dev, electron:build, electron:build:arm64, electron:build:x64 (+3 more)

### Community 28 - "chart.tsx"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 29 - "sheet.tsx"
Cohesion: 0.24
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 30 - "CreditOutstanding.tsx"
Cohesion: 0.27
Nodes (10): Progress, CreditOutstanding(), Settlement, formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder(), formatCurrency(), toISODatetime(), cleanMaldivesPhone() (+2 more)

### Community 31 - "Layout.tsx"
Cohesion: 0.24
Nodes (8): AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots(), PulsatingDotsProps

### Community 32 - "generate-pwa-icons.mjs"
Cohesion: 0.28
Nodes (4): crc32(), createPNG(), makeChunk(), publicDir

### Community 33 - "indexedDb.ts"
Cohesion: 0.36
Nodes (8): clearStore(), deleteStoreItem(), getStoreAll(), openDatabase(), putStoreBatch(), putStoreItem(), StoreName, STORES

### Community 34 - "telegram-webhook.ts"
Cohesion: 0.43
Nodes (7): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase

### Community 35 - "dropdown-menu.tsx"
Cohesion: 0.25
Nodes (7): DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 36 - "drawer.tsx"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "navigation-menu.tsx"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

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

### Community 48 - "utils.ts"
Cohesion: 0.16
Nodes (30): react-router-dom, App(), queryClient, ErrorBoundary, Props, State, Card, CardContent (+22 more)

### Community 50 - "input-otp.tsx"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 52 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `react`, `POS.tsx`, `DailySales.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `command.tsx`, `pagination.tsx`, `Admin.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `CreditOutstanding.tsx`, `dropdown-menu.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `utils.ts`, `input-otp.tsx`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.10530270502361529 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `POS.tsx`, `DailySales.tsx`, `cn`, `dependencies`, `AppContext.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `UserDialog.tsx`, `command.tsx`, `pagination.tsx`, `Admin.tsx`, `carousel.tsx`, `main.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `CreditOutstanding.tsx`, `Layout.tsx`, `dropdown-menu.tsx`, `drawer.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `utils.ts`, `input-otp.tsx`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Should `POS.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.088841882601798 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `dependencies` to `build-vercel.mjs`, `package.json`, `telegram-webhook.ts`, `UserDialog.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `DailySales.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13602693602693602 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05928614640048397 - nodes in this community are weakly interconnected._