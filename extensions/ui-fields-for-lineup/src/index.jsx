import React, { useState, useEffect, useRef } from "react";
import {
  Banner,
  Text,
  BlockStack,
  View,
  render,
  TextField,
  Checkbox,
  Button,
  useExtensionCapability,
  useApplyAttributeChange,
  useCartLines,
  Spinner,
  useBuyerJourneyIntercept,
  useBuyerJourneyCompleted,
  useCurrency,
  useApplyMetafieldsChange,
  useMetafield,
  InlineLayout,
} from "@shopify/checkout-ui-extensions-react";

render("Checkout::Dynamic::Render", () => <App />);

function App() {
  //Main variables
  const API_URL =
    "https://cors-anywhere.herokuapp.com/https://3ff0-2800-bf0-8014-9d-b5d4-7471-a55b-2b1a.ngrok-free.app";

  const MAIN_TOKEN = "";
  const API_KEY = "9b2c299397f0cb50d8512e6067e18e1adb33a733";
  const API_SECRET = "^4-p8ijc^2sg9nh41&e$-oorj@66z@qs7f_qeofat=fkmn$hb3";
  // Define the metafield namespace and key
  const metafieldNamespace = "loyalty";
  const lineUpCardNumberKey = "lineUpCardNumber";

  // Define currency
  const currency = useCurrency();
  const symbol = getCurrencySymbol("en-US", currency.isoCode);

  // Interval
  var timerInterval = null;
  var isTimerRunning = null;

  // Set up the checkbox state
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [isLineupCardValid, setIsLineupCardValid] = useState("");
  const [clientDetails, setClientDetails] = useState(null);
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [saldoGastar, setSaldoGastar] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCardValueUpdated, setIsCardValueUpdated] = useState(false);
  const [token, setToken] = useState(MAIN_TOKEN);

  //Setup token validation
  const [isTokenValidating, setIsTokenValidating] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenText, setTokenText] = useState("");
  const [tokenError, setTokenError] = useState("");
  var temporalToken = null;

  //buyer journey
  const journey = useBuyerJourneyCompleted();
  if (journey) {
    console.log("journey complete", journey);
    if (tokenText !== "" && temporalToken !== null) {
      deleteToken();
    }
  }

  // Set the entry point for the extension
  const canBlockProgress = useExtensionCapability("block_progress");
  const applyAttributeChange = useApplyAttributeChange();
  // const attributes = useAttributes();
  const cartLines = useCartLines();

  // Get a reference to the metafield
  const lineUpCardNumberMetafield = useMetafield({
    namespace: metafieldNamespace,
    key: lineUpCardNumberKey,
  });

  // Set a function to handle updating a metafield
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // get the sum of all values into cartLines array in cartLines[].cost.totalAmount.amount
  const subtotal = cartLines.reduce((acc, item) => {
    return acc + item.cost.totalAmount.amount;
  }, 0);

  //Intercept the buyer journey
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && isCardValueUpdated) {
      return {
        behavior: "block",
        reason: "La Tarjeta Lineup Rewards ha actualizado su saldo",
        errors: [
          {
            message:
              "El saldo de su tarjeta Lineup Rewards ha cambiado, eliminela o acepte el nuevo saldo para proceder con el pago",
          },
        ],
      };
    } else {
      return {
        behavior: "allow",
      };
    }
  });

  function resetCard() {
    //card
    setLineupCardNumber("");
    setIsLineupCardValid("");
    setSaldoDisponible(null);
    setCardAdded(false);
    //clients
    setClientDetails(null);
    setIsCardValueUpdated(false);
    // Stop the timer
    stopTimerLoop();
    // Apply the change to the attribute
    applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
    applyAttributeChange({
      key: "lineupCardNumber",
      type: "updateAttribute",
      value: "null",
    });
    applyAttributeChange({
      key: "lineupCardEmail",
      type: "updateAttribute",
      value: "null",
    });
    // Apply the change to the metafield lineup number
    applyMetafieldsChange({
      type: "updateMetafield",
      namespace: metafieldNamespace,
      key: lineUpCardNumberKey,
      valueType: "string",
      value: "",
    });
    // deletes the current token
    if (tokenText !== "" && temporalToken !== null) {
      deleteToken();
    }
    setIsTokenValidating(false);
    setIsTokenValid(false);
    setTokenText("");
    temporalToken = null;
  }

  // Use effect to clear the card number and value when the user unchecks the checkbox
  useEffect(() => {
    resetCard();
  }, [useLineupCard]);

  // function to clear validation errors
  function clearValidationErrors() {
    setIsLineupCardValid("");
    setTokenError("");
  }

  async function handleEmailCodeButtonClick() {
    // Inicializa un array para almacenar los errores de validación.
    let errors = {
      lineup: "",
    };

    //Start validations
    const regex = /^[0-9]+$/;

    //Validaciones de Lineup
    if (lineupCardNumber.trim() === "") {
      errors.lineup = "Ingresa el número de tarjeta";
    } else if (lineupCardNumber.length < 9) {
      errors.lineup = "La tarjeta debe tener más de 9 dígitos";
    } else if (!regex.test(lineupCardNumber)) {
      errors.lineup = "La tarjeta solo debe contener números";
    }

    // Si hay errores, establece los mensajes de error y retorna.
    if (errors.lineup) {
      setIsLineupCardValid(errors.lineup);
      return;
    }

    // Add a loading spinner
    setIsLoading(true);

    // Simulate an API call
    const data = await createToken();

    // Remove the loading spinner
    setIsLoading(false);

    if (data.sent) {
      setIsTokenValidating(true);
      setCardAdded(true);
      temporalToken = data.token;

      applyAttributeChange({
        key: "lineupCardNumber",
        type: "updateAttribute",
        value: lineupCardNumber,
      });

      // Apply the change to the metafield lineup number
      await applyMetafieldsChange({
        type: "updateMetafield",
        namespace: metafieldNamespace,
        key: lineUpCardNumberKey,
        valueType: "string",
        value: lineupCardNumber,
      });
    } else {
      setIsLineupCardValid(
        "El número de la tarjeta Lineup Rewards o la cédula son inválidos"
      );
    }
  }

  // function to handle the checkbox change
  async function handleButtonClick() {
    if (useLineupCard) {
      // Inicializa un array para almacenar los errores de validación.
      let errors = {
        token: "",
      };

      //Start validations
      const regex = /^[0-9]+$/;

      //Validaciones de Lineup
      if (tokenText.trim() === "") {
        errors.token = "Ingresa un token";
      } else if (tokenText.length < 6) {
        errors.token = "El token debe tener más de 6 dígitos";
      } else if (!regex.test(tokenText)) {
        errors.lineup = "El token solo debe contener números";
      }

      // Si hay errores, establece los mensajes de error y retorna.
      if (errors.lineup) {
        setTokenError(errors.lineup);
        return;
      }

      // Add a loading spinner
      setIsLoading(true);

      // Simulate an API call
      const data = await tokenCall();

      // Remove the loading spinner
      setIsLoading(false);

      if (data.esValido) {
        const saldo =
          data.saldo >= subtotal ? subtotal.toString() : data.saldo.toString();
        setSaldoDisponible(data.saldo);
        setSaldoGastar(saldo);
        setClientDetails(data.extra);
        clearValidationErrors();

        // adds the value of the card to the attributes
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: (saldo / parseFloat(data.extra.cambio)).toFixed(2),
        });

        await applyAttributeChange({
          key: "lineupCardEmail",
          type: "updateAttribute",
          value: data.extra.email,
        });

        //----------------------Timer----------------------//

        isTimerRunning = true;
        // Start the timer loop
        startTimerLoop(data.saldo);

        setIsTokenValid(true);
        setIsTokenValidating(false);
      } else {
        setTokenError(
          "El token no es válido, por favor verifica su correo electrónico"
        );
      }
    }
  }

  async function deleteToken() {
    //Body
    if (temporalToken) {
      var raw = JSON.stringify({
        token: temporalToken,
      });

      temporalToken = null;
    } else {
      var raw = JSON.stringify({
        token: tokenText,
      });
    }

    //options
    var requestOptions = {
      method: "POST",
      headers: {
        "X-Requested-With": "",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/cliente/eliminar-token-validacion/",
        requestOptions
      );

      if (response.status === 404 || response.status === 400) {
        return {
          eliminado: false,
        };
      }

      const responseData = await response.json();
      return {
        eliminado: true,
        data: responseData,
      };
    } catch (error) {
      // Manejo de errores de la llamada fetch
      console.error("Error en la llamada API:", error);
      throw error;
    }
  }

  async function createToken() {
    //Body
    var raw = JSON.stringify({
      tarjeta: {
        numero_de_tarjeta: lineupCardNumber,
      },
    });

    //options
    var requestOptions = {
      method: "POST",
      headers: {
        "X-Requested-With": "",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/cliente/crear-token-validacion/",
        requestOptions
      );

      // Si el status es 401, obtenemos un nuevo token y reintentamos la llamada
      if (response.status === 401) {
        const newToken = await getNewToken();

        // Actualizamos el token en las opciones de la solicitud
        requestOptions.headers.Authorization = `Bearer ${newToken}`;

        // Intentamos la llamada nuevamente
        const response2 = await fetch(
          API_URL + "/api/cliente/crear-token-validacion/",
          requestOptions
        );

        // Si el status sigue siendo 401, lanzamos un error
        if (response2.status === 404 || response2.status === 400) {
          return {
            sent: false,
          };
        }

        const responseData2 = await response2.json();
        return responseData2;
      }

      if (response.status === 404 || response.status === 400) {
        return {
          sent: false,
        };
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      // Manejo de errores de la llamada fetch
      console.error("Error en la llamada API:", error);
      throw error;
    }
  }

  async function tokenCall() {
    //Body
    var raw = JSON.stringify({
      token: tokenText,
      currency: currency.isoCode,
    });

    //options
    var requestOptions = {
      method: "POST",
      headers: {
        "X-Requested-With": "",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/cliente/obtener-balance-token/",
        requestOptions
      );

      if (response.status === 404) {
        return {
          esValido: false,
          saldo: 0,
        };
      }

      if (response.status === 400) {
        return {
          esValido: false,
          saldo: 0,
        };
      }

      const responseData = await response.json();
      return {
        esValido: true,
        saldo: responseData.credito,
        extra: responseData,
      };
    } catch (error) {
      // Manejo de errores de la llamada fetch
      throw error;
    }
  }

  // Función para iniciar el bucle del temporizador
  async function startTimerLoop(saldo) {
    let previousSaldo = saldo;

    // Asignar el intervalo a la variable de referencia
    timerInterval = setInterval(async () => {
      if (!isTimerRunning) {
        clearInterval(timerInterval);
        return;
      }

      let updatedData = await tokenCall();
      let updatedSaldoGastar =
        updatedData.saldo >= subtotal
          ? subtotal.toString()
          : updatedData.saldo.toString();

      //testing
      console.log("previousSaldo", previousSaldo);
      console.log("saldoGastar", updatedData.saldo);
      //end testing

      if (updatedData.saldo !== previousSaldo) {
        console.log("saldo actualizado");

        setSaldoDisponible(updatedData.saldo);
        setSaldoGastar(updatedSaldoGastar);
        setIsCardValueUpdated(true);

        // Actualizar el valor del atributo y metafield con el valor de la tarjeta actualizado
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: updatedSaldoGastar,
        });

        // Limpiar el intervalo
        clearInterval(timerInterval);
      }

      previousSaldo = updatedData.saldo;
    }, 30000); // Intervalo de 30 segundos
  }

  // Función para detener el bucle del temporizador
  // Función para detener el bucle del temporizador
  function stopTimerLoop() {
    isTimerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
  }

  // function to handle the remove card button
  function handleAccept() {
    setIsCardValueUpdated(false);
  }

  async function getNewToken() {
    //Body
    var raw = JSON.stringify({
      api_key: API_KEY,
      api_secret: API_SECRET,
    });

    //options
    var requestOptions = {
      method: "POST",
      headers: {
        "X-Requested-With": "",
        "Content-Type": "application/json",
      },
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/auth/access_token/",
        requestOptions
      );

      // Si el status sigue siendo 401, lanzamos un error
      if (response.status === 401) {
        throw new Error("Error de autenticación después de renovar el token 1");
      }
      const new_token = await response.json();
      setToken(new_token.token);
      return new_token.token;
    } catch (error) {
      // Manejo de errores de la llamada fetch
      console.error("Error en la llamada API:", error);
      throw error;
    }
  }

  function getCurrencySymbol(locale, currencyCode) {
    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const parts = format.formatToParts(123);
    let zeroDecimalCurrency = false;
    for (let part of parts) {
      if (part.type === "integer") {
        zeroDecimalCurrency = true;
      } else if (zeroDecimalCurrency && part.type === "decimal") {
        zeroDecimalCurrency = false;
        break;
      }
    }

    if (zeroDecimalCurrency) {
      parts.pop();
      parts.pop();
    }

    return parts
      .filter((part) => part.type === "currency")
      .map((part) => part.value)[0];
  }

  // Return the JSX to render
  return (
    <BlockStack>
      <View padding="base">
        <Banner status="info">
          <Checkbox
            checked={useLineupCard}
            onChange={setUseLineupCard}
            disabled={isLoading ? true : false}
          >
            {useLineupCard
              ? "Eliminar tarjeta Lineup Rewards"
              : "Usar tarjeta Lineup Rewards para obtener un descuento"}
          </Checkbox>
        </Banner>
      </View>
      {useLineupCard && (
        <BlockStack spacing="base">
          {!cardAdded && (
            <BlockStack spacing="base">
              <TextField
                label="Número de tarjeta Lineup Rewards"
                value={lineupCardNumber}
                onChange={setLineupCardNumber}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                disabled={isLoading ? true : false}
                error={isLineupCardValid}
              />
              <Button
                disabled={isLoading ? true : false}
                onPress={handleEmailCodeButtonClick}
              >
                Agregar tarjeta lineup para esta compra
              </Button>
              {isLoading && <Spinner />} {/* Loader */}
            </BlockStack>
          )}
          {
            isTokenValidating && (
              <BlockStack spacing="base">
                <TextField
                  label="Ingrese el token que fue enviado al correo registrado con Lineup Rewards"
                  value={tokenText}
                  onChange={setTokenText}
                  onInput={clearValidationErrors}
                  required={canBlockProgress}
                  disabled={isLoading ? true : false}
                  error={tokenError}
                />
                <InlineLayout columns={["fill", "fill"]} spacing="base">
                  <Button
                    kind="secondary"
                    disabled={isLoading ? true : false}
                    onPress={resetCard}
                  >
                    Cambiar de tarjeta
                  </Button>
                  <Button
                    kind="primary"
                    disabled={isLoading ? true : false}
                    onPress={handleButtonClick}
                  >
                    Validar código
                  </Button>
                </InlineLayout>
                {isLoading && <Spinner />} {/* Loader */}
              </BlockStack>
            ) /* Token validation loader */
          }
          {isTokenValid && saldoDisponible !== null && cardAdded && (
            <Banner
              status={!isCardValueUpdated ? "success" : "warning"}
              title="Tarjeta Lineup Rewards Agregada"
            >
              <BlockStack>
                <Text>Cliente: {clientDetails?.nombre}</Text>
                <Text>
                  Número de tarjeta: {lineUpCardNumberMetafield?.value}
                </Text>
                <Text>
                  Saldo disponible en la tarjeta: {symbol} {saldoDisponible}
                </Text>
                <Text appearance="info">
                  Valor de la tarjeta a utilizar en la compra: {symbol}{" "}
                  {saldoGastar}
                </Text>

                {!isCardValueUpdated && (
                  <Button kind="secondary" onPress={resetCard}>
                    Eliminar tarjeta
                  </Button>
                )}

                {isCardValueUpdated && (
                  <InlineLayout columns={["fill", "fill"]} spacing="base">
                    <Button kind="secondary" onPress={resetCard}>
                      Eliminar tarjeta
                    </Button>
                    <Button kind="primary" onPress={handleAccept}>
                      Aceptar el nuevo valor
                    </Button>
                  </InlineLayout>
                )}
              </BlockStack>
            </Banner>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default App;
