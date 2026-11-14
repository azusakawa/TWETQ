import re

path = 'src/worker.ts'
with open(path, 'rb') as f:
    raw = f.read()

# Strip UTF-8 BOM if present
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]

content = raw.decode('utf-8')
lines = content.split('\n')

fixed_count = 0
new_lines = []

for line in lines:
    new_line = line
    
    # FIX TYPE ANNOTATIONS ONLY: parameter declarations with 'str' or 'int'
    # Pattern: paramName: str  or  paramName: int  (in function signatures)
    # Match: (param: str) or (param: int) or (param: str, or (param: int,
    new_line = re.sub(r'(\w+): str\b', r'\1: string', new_line)
    new_line = re.sub(r'(\w+): int\b', r'\1: number', new_line)
    new_line = re.sub(r'(\w+): str$', r'\1: string', new_line)
    new_line = re.sub(r'(\w+): int$', r'\1: number', new_line)
    
    # FIX 'as str' and 'as int' casts
    new_line = re.sub(r'as str\b', 'as string', new_line)
    new_line = re.sub(r'as int\b', 'as number', new_line)
    
    # FIX Promise<str> and Promise<int> type references
    new_line = re.sub(r'Promise<str>', 'Promise<string>', new_line)
    new_line = re.sub(r'Promise<int>', 'Promise<number>', new_line)
    
    if new_line != line:
        fixed_count += 1
    
    new_lines.append(new_line)

with open(path, 'wb') as f:
    f.write('\n'.join(new_lines).encode('utf-8'))

print(f'Fixed {fixed_count} lines with str/int -> string/number type annotations')
