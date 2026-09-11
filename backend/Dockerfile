FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore em camada separada: mudanca de codigo nao invalida o cache de pacotes.
COPY ImobooCRM.sln ./
COPY src/ImobooCRM.Domain/*.csproj src/ImobooCRM.Domain/
COPY src/ImobooCRM.Application/*.csproj src/ImobooCRM.Application/
COPY src/ImobooCRM.Infrastructure/*.csproj src/ImobooCRM.Infrastructure/
COPY src/ImobooCRM.Api/*.csproj src/ImobooCRM.Api/
RUN dotnet restore

COPY . .
RUN dotnet publish src/ImobooCRM.Api/ImobooCRM.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Nao roda como root.
RUN adduser --disabled-password --gecos "" --uid 1001 appuser

# Criado e com dono definido ANTES do volume ser montado: quando o Docker cria
# o volume nomeado pela primeira vez, ele copia dono/permissoes deste diretorio
# da imagem. Sem isso, o volume nasceria do root e o appuser nao conseguiria escrever.
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

USER appuser

COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "ImobooCRM.Api.dll"]
