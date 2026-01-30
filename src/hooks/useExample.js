import { useState } from 'react';

export default function useExample(initial = 0) {
  const [value, setValue] = useState(initial);
  const increment = () => setValue(v => v + 1);
  return { value, increment, setValue };
}
