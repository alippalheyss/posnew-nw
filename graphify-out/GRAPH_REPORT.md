# Graph Report - sleepymeerkatglow-main  (2026-11-14)

## Corpus Check
- 181 files · ~484,067 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .ico 3, .css 2)

## Summary
- 1128 nodes · 4657 edges · 68 communities (43 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `55e33f3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ImageTextStampDialog.tsx
- command.tsx
- AppContext.tsx
- cn
- dependencies
- devDependencies
- StockAudit.tsx
- PosShortcutSettings.tsx
- sidebar.tsx
- package.json
- hooks/use-toast.ts
- App.tsx
- context-menu.tsx
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
- html2pdf.js@^0.14.0
- sonner.tsx
- class-variance-authority
- axios@^1.13.2
- clsx
- llamaService.ts
- vercel.json
- html5-qrcode
- @radix-ui/react-dialog
- @radix-ui/react-hover-card
- POS.tsx
- @radix-ui/react-dropdown-menu
- @radix-ui/react-slot
- auth.ts
- electron
- @radix-ui/react-switch
- @radix-ui/react-progress
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- react-resizable-panels
- @radix-ui/react-toast
- @radix-ui/react-tooltip
- tailwindcss-animate@^1.0.7
- @types/jsbarcode@^3.11.4
- @radix-ui/react-toggle
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
- `CustomerAddDialogProps` --references--> `Customer`  [EXTRACTED]
  src/components/CustomerAddDialog.tsx → src/context/AppContext.tsx
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

## Communities (68 total, 25 thin omitted)

### Community 0 - "ImageTextStampDialog.tsx"
Cohesion: 0.09
Nodes (25): @radix-ui/react-slider@^1.2.0, @radix-ui/react-slider, COLOR_MAP, ColorTheme, COMMON_PRESETS, createFallbackProductCardDataUrl(), ImageTextStampDialogProps, StylePreset (+17 more)

### Community 1 - "command.tsx"
Cohesion: 0.20
Nodes (10): Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+2 more)

### Community 2 - "AppContext.tsx"
Cohesion: 0.06
Nodes (97): date-fns, jspdf, jspdf-autotable, lucide-react, react, react-day-picker, react-i18next, react-router-dom (+89 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (46): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, CardFooter, DialogOverlay (+38 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, date-fns@^3.6.0, embla-carousel-react@^8.3.0, framer-motion@^13.4.4, @hookform/resolvers@^3.9.0, i18next@^25.7.4, input-otp@^1.2.4, jsbarcode@^3.12.3 (+36 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (31): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+23 more)

### Community 6 - "StockAudit.tsx"
Cohesion: 0.08
Nodes (44): OnlineOrdersDialogProps, STATUS_STYLE, PendingRegistrationsDialogProps, ShopSettings, Database, DEFAULT_SETTINGS_USER_ID, supabase, supabaseAnonKey (+36 more)

### Community 7 - "PosShortcutSettings.tsx"
Cohesion: 0.26
Nodes (13): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, DEFAULT_POS_SHORTCUTS, eventToCombo(), isTypingCombo(), matchPosShortcut(), MODIFIER_KEYS (+5 more)

### Community 8 - "sidebar.tsx"
Cohesion: 0.07
Nodes (29): Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+21 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (33): author, cmdk@^1.0.0, qrcode.react@^4.2.0, @radix-ui/react-accordion@^1.2.0, @radix-ui/react-alert-dialog@^1.1.1, @radix-ui/react-checkbox@^1.1.1, @radix-ui/react-context-menu@^2.2.1, @radix-ui/react-popover@^1.1.1 (+25 more)

### Community 10 - "hooks/use-toast.ts"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "App.tsx"
Cohesion: 0.14
Nodes (18): AmbientBackground, BankAlertPill(), Layout(), LayoutProps, ProtectedRoute(), ProtectedRouteProps, PulsatingDots(), PulsatingDotsProps (+10 more)

### Community 12 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 13 - "Admin.tsx"
Cohesion: 0.06
Nodes (57): Props, PriceFixDialogProps, initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState (+49 more)

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

### Community 24 - "build-vercel.mjs"
Cohesion: 0.05
Nodes (32): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url, { privateKey, publicKey }, png-to-ico@^3.0.2, png-to-ico, adminPath (+24 more)

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

### Community 48 - "POS.tsx"
Cohesion: 0.13
Nodes (98): xlsx, App(), AddCreditSaleDialog(), AppCloseConfirmDialog(), BankNotificationsDialog(), CustomerAddDialog(), CustomerAddDialogProps, CustomerDisplayOfferDialog() (+90 more)

### Community 52 - "electron"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

## Knowledge Gaps
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `ImageTextStampDialog.tsx`, `command.tsx`, `AppContext.tsx`, `StockAudit.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `hooks/use-toast.ts`, `App.tsx`, `context-menu.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Should `ImageTextStampDialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09462365591397849 - nodes in this community are weakly interconnected._
- **Why does `react` connect `AppContext.tsx` to `ImageTextStampDialog.tsx`, `command.tsx`, `cn`, `dependencies`, `StockAudit.tsx`, `PosShortcutSettings.tsx`, `sidebar.tsx`, `package.json`, `hooks/use-toast.ts`, `App.tsx`, `context-menu.tsx`, `Admin.tsx`, `pagination.tsx`, `drawer.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `navigation-menu.tsx`, `class-variance-authority`, `POS.tsx`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Should `AppContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06392486556085739 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `telegram-webhook.ts` to `build-vercel.mjs`, `package.json`, `App.tsx`, `StockAudit.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06233766233766234 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._