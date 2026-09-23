import ShamsMount from '../components/shams/ShamsMount';

// Wraps every page. Adds the live Shams section (mounted client-side after the demo section).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ShamsMount />
    </>
  );
}
