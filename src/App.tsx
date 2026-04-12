import { AppShell } from "@/features/layout/components/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <TooltipProvider>
      <div>
        <div className="sr-only">FPA Dashboard</div>
        <AppShell />
      </div>
    </TooltipProvider>
  )
}

export default App
