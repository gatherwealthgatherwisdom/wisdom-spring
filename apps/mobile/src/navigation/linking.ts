import type { LinkingOptions } from "@react-navigation/native";
import type { AppStackParamList } from "./types";

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ["spring://", "com.gwgwgroup.spring://"],
  config: {
    screens: {
      Main: {
        path: "",
        screens: {
          Inbox: "inbox",
          Image: "image",
          Discover: "discover",
          Settings: "me",
        },
      },
      Write: "write",
      Translate: "translate",
      Chat: "chat",
      Auth: "auth",
      Register: "register",
      Tool: "tool/:id",
      AllTools: "tools",
      AllBots: "bots",
      Notices: "notices",
    },
  },
};
