import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export const ExpoCodeViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const expoCode = `// Ứng dụng Việc Làm Phổ Thông Bắc Ninh - Bắc Giang (React Native / Expo)
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VIỆC LÀM PHỔ THÔNG</Text>
        <Text style={styles.subtitle}>Khu vực Bắc Ninh - Bắc Giang</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#1d4ed8', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
});`;

  const handleCopy = () => {
    navigator.clipboard.writeText(expoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs max-w-xl mx-auto my-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>React Native Expo Code</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép code'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto text-[11px] text-emerald-300 leading-relaxed">{expoCode}</pre>
    </div>
  );
};
