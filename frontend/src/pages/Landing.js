import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Wallet, Zap, TrendingUp, Camera, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth }  from "@/contexts/AuthContext";

const Landing = () => {
  const navigate       = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user }       = useAuth();

  React.useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const features = [
    { icon: Camera,     title: "AI Receipt Scanning",  desc: "Snap a photo — AI extracts store, date, amount and category automatically." },
    { icon: Zap,        title: "Instant Processing",   desc: "Get organised expense data in seconds, not minutes." },
    { icon: TrendingUp, title: "Smart Analytics",      desc: "Understand your spending patterns with beautiful charts." },
    { icon: Wallet,     title: "Budget Tracking",      desc: "Set category budgets and stay on track effortlessly." },
    { icon: TrendingUp, title: "Monthly Breakdown",    desc: "See exactly where your money went each month by category." },
    { icon: Zap,        title: "Month Comparison",     desc: "Compare Jan vs Feb vs Mar — spot trends instantly." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-stone-950/50 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xl font-heading font-bold text-white">SmartSpend</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-stone-400 hover:text-white">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/login")} className="text-stone-300 hover:text-white">
              Log In
            </Button>
            <Button onClick={() => navigate("/signup")} className="bg-accent hover:bg-accent/90 text-white rounded-full">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-white mb-6">
              Stop Tracking.<br />
              <span className="text-emerald-400">Start Snapping.</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto mb-8">
              AI-powered receipt scanning that automatically extracts and categorises your expenses. No manual entry ever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/signup")}
                className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 py-6 text-lg">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline"
                className="border-stone-600 text-white hover:bg-stone-800 rounded-full px-8 py-6 text-lg"
                onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16">
            <div className="aspect-video rounded-2xl overflow-hidden border border-stone-700 shadow-2xl">
              <img
                src="https://images.pexels.com/photos/6282081/pexels-photo-6282081.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Person scanning receipt with phone"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-stone-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-emerald-400 uppercase tracking-wide mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-white">
              Everything you need to manage expenses
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-stone-800/50 border border-stone-700 hover:border-emerald-500/50 transition-all">
                <f.icon className="w-10 h-10 text-emerald-400 mb-4" />
                <h3 className="text-xl font-heading font-medium text-white mb-2">{f.title}</h3>
                <p className="text-stone-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">
            Ready to simplify your finances?
          </h2>
          <Button size="lg" onClick={() => navigate("/signup")}
            className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 py-6 text-lg">
            Get Started Now
          </Button>
        </motion.div>
      </section>

      <footer className="py-8 px-4 border-t border-stone-800 text-center text-stone-500 text-sm">
        © {new Date().getFullYear()} SmartSpend. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
