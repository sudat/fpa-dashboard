import { AppShell } from "@/features/layout/components/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Agentation } from "agentation"

function App() {
  return (
    <TooltipProvider>
      <div>
        <div className="sr-only">FPA Dashboard</div>
        <AppShell />
        {import.meta.env.DEV && <Agentation />}
      </div>
    </TooltipProvider>
  )
}

export default App
