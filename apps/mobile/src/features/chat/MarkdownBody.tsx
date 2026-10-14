import { parseAssistantMarkdown, type BlockNode, type InlineNode } from "@spring/shared";
import { Platform, ScrollView, Text, View } from "react-native";
import { useColors, type Palette } from "../../shared/theme";

const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

export function MarkdownBody({
  source,
  color,
  size = 16,
  lineHeight = 26,
}: {
  source: string;
  color: string;
  size?: number;
  lineHeight?: number;
}) {
  const colors = useColors();
  const blocks = parseAssistantMarkdown(source);
  if (blocks.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} color={color} size={size} lineHeight={lineHeight} colors={colors} />
      ))}
    </View>
  );
}

function Block({
  block,
  color,
  size,
  lineHeight,
  colors,
}: {
  block: BlockNode;
  color: string;
  size: number;
  lineHeight: number;
  colors: Palette;
}) {
  if (block.type === "heading") {
    const headingSize = block.level === 1 ? size + 4 : block.level === 2 ? size + 2 : size;
    return (
      <Text style={{ color, fontSize: headingSize, lineHeight: headingSize + 8, fontWeight: "700" }}>
        <Inline nodes={block.children} color={color} size={headingSize} colors={colors} />
      </Text>
    );
  }
  if (block.type === "paragraph") {
    return (
      <Text style={{ color, fontSize: size, lineHeight }}>
        <Inline nodes={block.children} color={color} size={size} colors={colors} />
      </Text>
    );
  }
  if (block.type === "quote") {
    return (
      <View style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 10 }}>
        <Text style={{ color, fontSize: size, lineHeight }}>
          <Inline nodes={block.children} color={color} size={size} colors={colors} />
        </Text>
      </View>
    );
  }
  if (block.type === "code") {
    return (
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }}>
        <Text style={{ color, fontSize: size - 2, lineHeight: lineHeight - 4, fontFamily: mono }}>{block.text}</Text>
      </View>
    );
  }
  if (block.type === "list") {
    return (
      <View style={{ gap: 4 }}>
        {block.items.map((item, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ color, fontSize: size, lineHeight, width: 22 }}>
              {block.ordered ? `${index + 1}.` : "•"}
            </Text>
            <Text style={{ color, fontSize: size, lineHeight, flex: 1 }}>
              <Inline nodes={item} color={color} size={size} colors={colors} />
            </Text>
          </View>
        ))}
      </View>
    );
  }
  const compact = block.header.length <= 2;
  const table = (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: "hidden" }}>
      <TableRow cells={block.header} header compact={compact} color={color} size={size} colors={colors} />
      {block.rows.map((row, index) => (
        <TableRow key={index} cells={row} compact={compact} color={color} size={size} colors={colors} />
      ))}
    </View>
  );
  if (compact) return table;
  return (
    <ScrollView horizontal nestedScrollEnabled style={{ marginHorizontal: -4 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
      {table}
    </ScrollView>
  );
}

function TableRow({
  cells,
  header,
  compact,
  color,
  size,
  colors,
}: {
  cells: InlineNode[][];
  header?: boolean;
  compact?: boolean;
  color: string;
  size: number;
  colors: Palette;
}) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: header ? colors.card : "transparent" }}>
      {cells.map((cell, index) => (
        <View
          key={index}
          style={{
            ...(compact ? { flex: 1 } : { width: 112 }),
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRightWidth: index === cells.length - 1 ? 0 : 1,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ color, fontSize: size - 2, lineHeight: size + 6, fontWeight: header ? "700" : "400" }}>
            <Inline nodes={cell} color={color} size={size - 2} colors={colors} />
          </Text>
        </View>
      ))}
    </View>
  );
}

function Inline({
  nodes,
  color,
  size,
  colors,
}: {
  nodes: InlineNode[];
  color: string;
  size: number;
  colors: Palette;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "text") return <Text key={index}>{node.text}</Text>;
        if (node.type === "code") {
          return (
            <Text key={index} style={{ fontFamily: mono, backgroundColor: colors.card, fontSize: size - 1 }}>
              {node.text}
            </Text>
          );
        }
        const weight = node.type === "bold" ? "700" : "400";
        const style = node.type === "italic" ? "italic" : "normal";
        return (
          <Text key={index} style={{ color, fontWeight: weight, fontStyle: style }}>
            <Inline nodes={node.children} color={color} size={size} colors={colors} />
          </Text>
        );
      })}
    </>
  );
}
