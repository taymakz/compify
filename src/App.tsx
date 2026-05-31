import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import "./globals.css"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card"
import { Badge } from "@/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs"
import { Separator } from "@/components/separator"
import { Avatar, AvatarFallback } from "@/components/avatar"
import { Switch } from "@/components/switch"
import { Label } from "@/components/label"

function App() {
  const [greetMsg, setGreetMsg] = useState("")
  const [name, setName] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(false)

  async function greet() {
    setGreetMsg(await invoke("greet", { name }))
  }

  return (
    <div className={isDarkMode ? "dark" : ""}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    TS
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold">Tauri Starter</h1>
                  <p className="text-xs text-muted-foreground">Modern Desktop App</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="secondary">v2.0</Badge>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
                  <Switch 
                    id="dark-mode"
                    checked={isDarkMode}
                    onCheckedChange={setIsDarkMode}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container py-8">
            {/* Hero Section */}
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Tauri + React
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Build smaller, faster, and more secure desktop applications with a web frontend
              </p>
            </div>

            {/* Greet Card */}
            <Card className="mx-auto mb-8 max-w-2xl">
              <CardHeader>
                <CardTitle>Try the Greet Command</CardTitle>
                <CardDescription>
                  Test the Rust backend integration by sending a greeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    greet()
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex gap-2">
                    <Input
                      id="greet-input"
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                      placeholder="Enter your name..."
                      className="flex-1"
                    />
                    <Button type="submit" size="lg">
                      Greet
                    </Button>
                  </div>
                  {greetMsg && (
                    <div className="rounded-lg bg-primary/10 p-4 text-center">
                      <p className="text-lg font-semibold text-primary">{greetMsg}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Features Section */}
            <Tabs defaultValue="features" className="mx-auto max-w-4xl">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="fonts">Fonts</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="i-lucide-zap size-5 text-primary" />
                        Lightning Fast
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Built with Rust for maximum performance and minimal resource usage
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="i-lucide-shield size-5 text-primary" />
                        Secure by Default
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Security-first architecture with sandboxed frontend and controlled backend access
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="i-lucide-package size-5 text-primary" />
                        Small Bundle Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Significantly smaller than Electron apps, with faster startup times
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="i-lucide-palette size-5 text-primary" />
                        Modern UI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Beautiful components built with Tailwind CSS and shadcn/ui
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Font Families</CardTitle>
                    <CardDescription>
                      All fonts are loaded and ready to use in your application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="mb-2 font-semibold">Geist (Sans)</h3>
                      <p className="font-[Geist] text-lg">
                        The quick brown fox jumps over the lazy dog
                      </p>
                      <p className="font-[Geist] text-sm italic text-muted-foreground">
                        Variable weight font with italic support
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-2 font-semibold">Geist Mono</h3>
                      <p className="font-[Geist_Mono] text-lg">
                        const greeting = "Hello, World!";
                      </p>
                      <p className="font-[Geist_Mono] text-sm italic text-muted-foreground">
                        Perfect for code snippets and technical content
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-2 font-semibold">Vazirmatn (Persian/Arabic)</h3>
                      <p className="font-[Vazirmatn] text-lg" dir="rtl">
                        سلام دنیا - این یک فونت فارسی زیبا است
                      </p>
                      <p className="font-[Vazirmatn] text-sm text-muted-foreground">
                        Variable weight Persian/Arabic font
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-2 font-semibold">Geist Pixel Fonts</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="font-[Geist_Pixel_Circle] text-sm text-muted-foreground">Circle</p>
                          <p className="font-[Geist_Pixel_Circle] text-2xl">PIXEL ART</p>
                        </div>
                        <div>
                          <p className="font-[Geist_Pixel_Grid] text-sm text-muted-foreground">Grid</p>
                          <p className="font-[Geist_Pixel_Grid] text-2xl">PIXEL ART</p>
                        </div>
                        <div>
                          <p className="font-[Geist_Pixel_Line] text-sm text-muted-foreground">Line</p>
                          <p className="font-[Geist_Pixel_Line] text-2xl">PIXEL ART</p>
                        </div>
                        <div>
                          <p className="font-[Geist_Pixel_Square] text-sm text-muted-foreground">Square</p>
                          <p className="font-[Geist_Pixel_Square] text-2xl">PIXEL ART</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="font-[Geist_Pixel_Triangle] text-sm text-muted-foreground">Triangle</p>
                          <p className="font-[Geist_Pixel_Triangle] text-2xl">PIXEL ART</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="components" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>UI Component Library</CardTitle>
                    <CardDescription>
                      Pre-built components ready to use in your application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {[
                        "Button", "Input", "Card", "Badge", "Tabs", "Dialog",
                        "Select", "Switch", "Checkbox", "Radio", "Slider", "Progress",
                        "Avatar", "Alert", "Toast", "Tooltip", "Popover", "Dropdown",
                        "Accordion", "Carousel", "Calendar", "Table", "Form", "Sheet"
                      ].map((component) => (
                        <Badge key={component} variant="outline" className="justify-center py-2">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>

          {/* Footer */}
          <footer className="border-t py-6 mt-12">
            <div className="container text-center text-sm text-muted-foreground">
              <p>
                Built with{" "}
                <a
                  href="https://tauri.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Tauri
                </a>
                {" + "}
                <a
                  href="https://react.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  React
                </a>
                {" + "}
                <a
                  href="https://tailwindcss.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Tailwind CSS
                </a>
              </p>
            </div>
          </footer>
        </div>
    </div>
  )
}

export default App
