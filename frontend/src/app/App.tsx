import { AppProviders } from "@/providers/AppProviders";
import { AppRouter } from "@/routes/AppRouter";

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
