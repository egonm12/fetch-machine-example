import { assign, createMachine } from "xstate";
import { useMachine } from "@xstate/react";
import { useEffect } from "react";
import React from "react";
import ReactDOM from "react-dom";

interface FetchContext<FResolvedResponse, FRejectedResponse> {
  data?: FResolvedResponse;
  error?: FRejectedResponse;
}

type ResolvedFetchEvent<FResolvedResponse> = {
  type: "RESOLVE";
  data: FResolvedResponse;
};
type RejectedFetchEvent<FRejectedResponse> = {
  type: "REJECT";
  error: FRejectedResponse;
};

type FetchEvent<FResolvedResponse, FRejectedResponse, FParams, FBody> =
  | { type: "FETCH"; options?: { params?: FParams; body?: FBody } }
  | ResolvedFetchEvent<FResolvedResponse>
  | RejectedFetchEvent<FRejectedResponse>;

type FetchState<FResolvedResponse, FRejectedResponse> =
  | {
      value: "idle";
      context: FetchContext<FResolvedResponse, FRejectedResponse> & {
        data: undefined;
        error: undefined;
      };
    }
  | {
      value: "loading";
      context: FetchContext<FResolvedResponse, FRejectedResponse>;
    }
  | {
      value: "success";
      context: FetchContext<FResolvedResponse, FRejectedResponse> & {
        data: FResolvedResponse;
        error: undefined;
      };
    }
  | {
      value: "failure";
      context: FetchContext<FResolvedResponse, FRejectedResponse> & {
        data?: FResolvedResponse;
        error: FRejectedResponse;
      };
    };

const createActions = <
  FResolvedResponse,
  FRejectedResponse,
  FParams,
  FBody
>() => ({
  successAction: assign<
    FetchContext<FResolvedResponse, FRejectedResponse>,
    ResolvedFetchEvent<FResolvedResponse>
  >({
    data: (ctx, evt) => evt.data,
    error: undefined,
  }) as any,
  failureAction: assign<
    FetchContext<FResolvedResponse, FRejectedResponse>,
    RejectedFetchEvent<FRejectedResponse>
  >({
    error: (_, evt) => evt.error,
  }) as any,
});

const fetchMachine = <
  FResolvedResponse extends object = object,
  FRejectedResponse extends object = object,
  FParams extends object = object,
  FBody extends object = object
>() =>
  createMachine<
    FetchContext<FResolvedResponse, FRejectedResponse>,
    FetchEvent<FResolvedResponse, FRejectedResponse, FParams, FBody>,
    FetchState<FResolvedResponse, FRejectedResponse>
  >(
    {
      id: "fetch",
      initial: "idle",
      context: {
        data: undefined,
        error: undefined,
      },
      states: {
        idle: {
          on: {
            FETCH: {
              target: "loading",
            },
          },
        },
        loading: {
          invoke: {
            src: "fetchAction",
            onDone: {
              target: "success",
              actions: "successAction",
            },
            onError: {
              target: "failure",
              actions: "failureAction",
            },
          },
        },
        success: {
          on: {
            FETCH: {
              target: "loading",
            },
          },
        },
        failure: {
          on: {
            FETCH: {
              target: "loading",
            },
          },
        },
      },
    },
    {
      actions: createActions<
        FResolvedResponse,
        FRejectedResponse,
        FParams,
        FBody
      >(),
    }
  );

interface User {
  address: {
    city: string;
    geo: {
      lat: string;
      lng: string;
    };
    street: string;
    suite: string;
    zipcode: string;
  };
  company: {
    bs: string;
    catchPhrase: string;
    name: string;
  };
  email: string;
  id: number;
  name: string;
  phone: string;
  username: string;
  website: string;
}

const fetchUsers = async (endpoint: string) => {
  return fetch(endpoint)
    .then((r) => r.json())
    .catch((e) => e);
};

const App: React.FC<{}> = () => {
  const [state, send] = useMachine(fetchMachine<User[], Error>(), {
    services: {
      fetchAction: () =>
        fetchUsers("https://jsonplaceholder.typicode.com/users"),
    },
  });

  useEffect(() => {
    send({ type: "FETCH" });
  }, [send]);

  useEffect(() => {
    if (state.matches("success")) {
      console.log(state.context.data.map((user) => user.name));
    }
  }, [state]);

  return null;
};

ReactDOM.render(<App />, document.getElementById("root"));
